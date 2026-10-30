import type { AwEvent } from './awTypes'
import { getClientSessionStartMs } from './clientSessionClock'
import { formatDuration } from './aggregations'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { formatClock, isSameLocalCalendarDay, parseIso, startOfLocalDay, toYmdLocal } from './timeutil'
import type { SystemRecordPeriodId, WorkRecordSettings } from './workRecordSettings'
import { isAiAutoSummaryActive, systemRecordIntervalMs } from './workRecordSettings'

const LAST_FIRE_PREFIX = 'ganshale-ai-summary-last-fire:'
const NEXT_AT_PREFIX = 'ganshale-ai-summary-next-at:'
const SESSION_ANCHOR_KEY = 'ganshale-ai-summary-session-anchor'
// 不使用会随页面/主题重新激活而变化的工作计时起点。
const CLIENT_OPENED_AT_MS = typeof performance !== 'undefined'
  ? Math.floor(performance.timeOrigin) : getClientSessionStartMs()

function lastFireKey(day: Date): string {
  return `${LAST_FIRE_PREFIX}${toYmdLocal(day)}`
}

export function loadLastAiSummaryAt(day: Date): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(lastFireKey(day))
    if (!raw) return null
    const t = Date.parse(raw)
    return Number.isNaN(t) ? null : t
  } catch {
    return null
  }
}

export function saveLastAiSummaryAt(day: Date, atMs: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(lastFireKey(day), new Date(atMs).toISOString())
  } catch {
    /* quota */
  }
}

export function clearLastAiSummaryAt(day: Date): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(lastFireKey(day))
  } catch {
    /* ignore */
  }
}

function nextAtKey(day: Date): string {
  return `${NEXT_AT_PREFIX}${toYmdLocal(day)}`
}

export function loadNextAiSummaryAt(day: Date): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(nextAtKey(day))
    if (!raw) return null
    const t = Date.parse(raw)
    return Number.isNaN(t) ? null : t
  } catch {
    return null
  }
}

export function saveNextAiSummaryAt(day: Date, atMs: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(nextAtKey(day), new Date(atMs).toISOString())
  } catch {
    /* quota */
  }
}

export function clearNextAiSummaryAt(day: Date): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(nextAtKey(day))
  } catch {
    /* ignore */
  }
}

export function clearAiSummaryScheduleForDay(day: Date): void {
  clearLastAiSummaryAt(day)
  clearNextAiSummaryAt(day)
  clearSessionAnchor()
}

function clearSessionAnchor(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_ANCHOR_KEY)
  } catch {
    /* ignore */
  }
}

/** 首次按客户端打开时间锚定；页面重挂载不改变计划，间隔变化才重设。 */
export function ensureAiSummaryAnchoredForSession(
  day: Date,
  settings: WorkRecordSettings,
  nowMs: number = Date.now(),
): void {
  if (typeof window === 'undefined') return
  if (!isAiAutoSummaryActive(settings)) return
  if (!isSameLocalCalendarDay(day, new Date())) return

  const period = settings.systemRecordPeriod
  if (period === '12:00' || period === '18:00') return

  const intervalMs = systemRecordIntervalMs(settings)
  if (intervalMs == null) return

  const ymd = toYmdLocal(day)
  const sessionStart = CLIENT_OPENED_AT_MS
  let periodChanged = false

  try {
    const raw = sessionStorage.getItem(SESSION_ANCHOR_KEY)
    if (raw) {
      const o = JSON.parse(raw) as { sessionStart?: number; ymd?: string; period?: string }
      if (o.sessionStart === sessionStart && o.ymd === ymd) {
        periodChanged = o.period !== undefined && o.period !== period
        const next = loadNextAiSummaryAt(day)
        if (next != null && !periodChanged) return
      }
    }
  } catch {
    /* ignore */
  }

  const last = loadLastAiSummaryAt(day)
  const base = periodChanged ? nowMs : Math.max(startOfLocalDay(day).getTime(), last ?? sessionStart)
  saveNextAiSummaryAt(day, base + intervalMs)
  sessionStorage.setItem(
    SESSION_ANCHOR_KEY,
    JSON.stringify({ sessionStart, ymd, period }),
  )
}

/** 所选日期是否为本地「今天」（仅今天运行自动总结与绿色徽章） */
export function isAiSummaryScheduleDay(day: Date, now = new Date()): boolean {
  return isSameLocalCalendarDay(day, now)
}

/** 本次总结窗口：自上次触发至 now（不早于当日 0 点） */
export function aiSummaryWindowBounds(
  day: Date,
  nowMs: number,
  periodId: SystemRecordPeriodId,
): { startMs: number; endMs: number } {
  const dayStart = startOfLocalDay(day).getTime()
  const endMs = nowMs
  const intervalMs = systemRecordIntervalMs({
    aiAutoSummaryEnabled: true,
    systemRecordPeriod: periodId,
    reflectPromptEnabled: true,
  })
  const last = loadLastAiSummaryAt(day)
  let startMs = last ?? (intervalMs != null ? endMs - intervalMs : dayStart)
  if (intervalMs != null && endMs - startMs > intervalMs * 1.5) {
    startMs = endMs - intervalMs
  }
  if (startMs < dayStart) startMs = dayStart
  if (startMs >= endMs) startMs = Math.max(dayStart, endMs - (intervalMs ?? 30 * 60_000))
  return { startMs, endMs }
}

export function filterWindowEventsInRange(
  events: AwEvent[],
  day: Date,
  startMs: number,
  endMs: number,
): AwEvent[] {
  return events
    .filter((ev) => {
      if (shouldSkipWindowEventForStats(ev)) return false
      const start = parseIso(ev.timestamp)
      const end = start + Math.max(0, ev.duration) * 1000
      if (!isSameLocalCalendarDay(new Date(start), day)) return false
      return end > startMs && start <= endMs
    })
    .sort((a, b) => parseIso(a.timestamp) - parseIso(b.timestamp))
}

function clockTargetMs(day: Date, slot: '12:00' | '18:00', afterMs: number): number {
  const [hh, mm] = slot.split(':').map(Number)
  const target = new Date(day)
  target.setHours(hh, mm, 0, 0)
  let t = target.getTime()
  if (t <= afterMs) {
    const next = new Date(target)
    next.setDate(next.getDate() + 1)
    t = next.getTime()
  }
  return t
}

/** 距离下次自动总结的时间点（毫秒时间戳） */
export function getNextAiSummaryAtMs(
  day: Date,
  settings: WorkRecordSettings,
  nowMs: number = Date.now(),
): number | null {
  if (!isAiAutoSummaryActive(settings)) return null

  const period = settings.systemRecordPeriod
  if (period === '12:00' || period === '18:00') {
    return clockTargetMs(day, period, nowMs)
  }

  const intervalMs = systemRecordIntervalMs(settings)
  if (intervalMs == null) return null

  if (!isAiSummaryScheduleDay(day, new Date(nowMs))) return null

  const nextStored = loadNextAiSummaryAt(day)
  if (nextStored != null) return nextStored

  const last = loadLastAiSummaryAt(day)
  if (last != null) {
    const next = last + intervalMs
    saveNextAiSummaryAt(day, next)
    return next
  }

  const next = Math.max(startOfLocalDay(day).getTime(), CLIENT_OPENED_AT_MS) + intervalMs
  saveNextAiSummaryAt(day, next)
  return next
}

export function formatAiSummaryCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatWindowEventsForAiSummary(events: AwEvent[]): string {
  if (events.length === 0) return '（该时段无窗口记录）'
  return events
    .map((ev, i) => {
      const startMs = parseIso(ev.timestamp)
      const durationSec = Math.max(0, Math.round(ev.duration))
      const endMs = startMs + durationSec * 1000
      const app = String(ev.data.app ?? 'unknown')
        .replace(/\.exe$/i, '')
        .trim()
      const title = String(ev.data.title ?? '').trim() || '—'
      return [
        `${i + 1}. 应用：${app}`,
        `   窗口标题：${title}`,
        `   开始：${formatClock(new Date(startMs))}  结束：${formatClock(new Date(endMs))}  时长：${durationSec}秒（${formatDuration(durationSec)}）`,
      ].join('\n')
    })
    .join('\n\n')
}
