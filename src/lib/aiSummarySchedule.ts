import type { AwEvent } from './awTypes'
import { formatDuration } from './aggregations'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { formatClock, isSameLocalCalendarDay, parseIso, startOfLocalDay, toYmdLocal } from './timeutil'
import type { SystemRecordPeriodId, WorkRecordSettings } from './workRecordSettings'
import { isAiAutoSummaryActive, systemRecordIntervalMs } from './workRecordSettings'

const LAST_FIRE_PREFIX = 'ganshale-ai-summary-last-fire:'

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

  const dayStart = startOfLocalDay(day).getTime()
  const last = loadLastAiSummaryAt(day)

  if (last != null) {
    let next = last + intervalMs
    while (next <= nowMs) {
      next += intervalMs
    }
    return next
  }

  const elapsed = Math.max(0, nowMs - dayStart)
  const periodIndex = Math.floor(elapsed / intervalMs)
  return dayStart + (periodIndex + 1) * intervalMs
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
