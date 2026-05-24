import type { AwEvent } from './awTypes'
import { chartColorFromMap, chartColorMapForApps } from './appBrandIcons'
import type { LiveForegroundSample } from './liveForeground'
import {
  isLiveForegroundSkippedForStats,
  shouldSkipWindowEventForStats,
} from './selfWindowFilter'
import {
  extrapolateWindowEventToNow,
  findLatestWindowEvent,
  findLatestWindowEventForApp,
  liveForegroundSegmentSec,
  sameForegroundApp,
} from './windowForegroundMatch'
import { identityFromEventData, identityFromLiveForeground } from './windowAppDisplay'
import {
  daysInLocalWeek,
  endOfLocalDay,
  formatClock,
  parseIso,
  startOfLocalDay,
  startOfWeekMondayLocal,
} from './timeutil'

export { colorForAppLabel } from './appPalette'

export interface TimelineSeg {
  id: string
  label: string
  startMin: number
  endMin: number
  color: string
}

function minutesSinceMidnight(d: Date, dayStart: Date): number {
  return (d.getTime() - dayStart.getTime()) / 60_000
}

function windowLabel(ev: AwEvent): string {
  return identityFromEventData(ev.data).displayName
}

function windowColorKey(ev: AwEvent): string {
  return identityFromEventData(ev.data).identityKey
}

export function timelineFromWindowEvents(
  day: Date,
  events: AwEvent[],
): TimelineSeg[] {
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  const segs: TimelineSeg[] = []

  const sorted = [...events].sort(
    (a, b) => parseIso(a.timestamp) - parseIso(b.timestamp),
  )

  const colorMap = chartColorMapForApps(appTotalsForDay(day, events).map((r) => r.identityKey))

  for (const ev of sorted) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const start = parseIso(ev.timestamp)
    const end = start + ev.duration * 1000
    const clipStart = Math.max(start, t0)
    const clipEnd = Math.min(end, t1)
    if (clipEnd <= clipStart) continue
    const label = windowLabel(ev)
    const colorKey = windowColorKey(ev)
    const sm = minutesSinceMidnight(new Date(clipStart), day0)
    const em = minutesSinceMidnight(new Date(clipEnd), day0)
    segs.push({
      id: ev.id,
      label,
      startMin: sm,
      endMin: em,
      color: chartColorFromMap(colorMap, colorKey),
    })
  }
  return segs
}

/**
 * 时间分布（采集中）：在 {@link timelineFromWindowEvents} 基础上将当前前台片段延伸到 `nowMs`。
 * 与实时窗口记录、办公总时长使用同一套前台匹配逻辑。
 */
export function timelineFromWindowEventsLive(
  day: Date,
  events: AwEvent[],
  live: LiveForegroundSample | null,
  nowMs: number,
  extrapolate: boolean,
): TimelineSeg[] {
  const segs = timelineFromWindowEvents(day, events)
  if (!extrapolate || !live || isLiveForegroundSkippedForStats(live)) return segs

  const statsEvents = events.filter((e) => !shouldSkipWindowEventForStats(e))
  const day0 = startOfLocalDay(day)
  const t1 = endOfLocalDay(day).getTime()

  const extendSegEnd = (ev: AwEvent) => {
    const idx = segs.findIndex((s) => s.id === ev.id)
    if (idx < 0) return
    const start = parseIso(ev.timestamp)
    const clipStartMs = Math.max(start, day0.getTime())
    const segStartMs =
      live.segmentStartedAt && sameForegroundApp(ev.data, live)
        ? Math.max(parseIso(live.segmentStartedAt), clipStartMs)
        : clipStartMs
    const liveEnd = Math.min(nowMs, t1)
    if (liveEnd <= segStartMs) return
    const sm = minutesSinceMidnight(new Date(segStartMs), day0)
    const em = minutesSinceMidnight(new Date(liveEnd), day0)
    segs[idx] = {
      ...segs[idx],
      startMin: Math.max(segs[idx].startMin, sm),
      endMin: Math.max(sm + 1 / 60, em),
    }
  }

  const latest = findLatestWindowEvent(statsEvents)
  if (latest && sameForegroundApp(latest.data, live)) {
    extendSegEnd(latest)
    return segs
  }

  const latestForApp = findLatestWindowEventForApp(statsEvents, live)
  if (latestForApp) {
    extendSegEnd(latestForApp)
    return segs
  }

  const start = live.segmentStartedAt
    ? parseIso(live.segmentStartedAt)
    : live.capturedAt
      ? parseIso(live.capturedAt)
      : nowMs
  const clipStart = Math.max(start, day0.getTime())
  const clipEnd = Math.min(nowMs, t1)
  if (clipEnd <= clipStart) return segs

  const liveId = identityFromLiveForeground(live)
  const apps = appTotalsForDay(day, events).map((r) => r.identityKey)
  if (!apps.includes(liveId.identityKey)) apps.push(liveId.identityKey)
  const colorMap = chartColorMapForApps(apps)
  const sm = minutesSinceMidnight(new Date(clipStart), day0)
  const em = minutesSinceMidnight(new Date(clipEnd), day0)
  segs.push({
    id: `live-${nowMs}`,
    label: liveId.displayName,
    startMin: sm,
    endMin: em,
    color: chartColorFromMap(colorMap, liveId.identityKey),
  })
  return segs.sort((a, b) => a.startMin - b.startMin)
}

export type HourlyWorkdayBucket = {
  hour: number
  totalSec: number
  parts: { label: string; sec: number; color: string }[]
}

/** 将时间线段按本地小时（默认 8:00—24:00）聚合，供柱状图纵轴时长 */
export function hourlyWorkdayBucketsFromTimeline(
  segments: TimelineSeg[],
  startHour = 8,
  endHour = 24,
): HourlyWorkdayBucket[] {
  const startMin = startHour * 60
  const endMin = endHour * 60
  const n = endHour - startHour
  const totals = Array.from({ length: n }, () => 0)
  const maps = Array.from({ length: n }, () => new Map<string, { sec: number; color: string }>())

  for (const seg of segments) {
    const segStart = Math.max(seg.startMin, startMin)
    const segEnd = Math.min(seg.endMin, endMin)
    if (segEnd <= segStart) continue

    for (let i = 0; i < n; i++) {
      const h = startHour + i
      const b0 = h * 60
      const b1 = (h + 1) * 60
      const cs = Math.max(segStart, b0)
      const ce = Math.min(segEnd, b1)
      if (ce <= cs) continue
      const sec = Math.round((ce - cs) * 60)
      totals[i] += sec
      const m = maps[i]
      const prev = m.get(seg.label)
      if (prev) prev.sec += sec
      else m.set(seg.label, { sec, color: seg.color })
    }
  }

  return Array.from({ length: n }, (_, i) => ({
    hour: startHour + i,
    totalSec: totals[i],
    parts: [...maps[i].entries()]
      .map(([label, v]) => ({ label, sec: v.sec, color: v.color }))
      .sort((a, b) => b.sec - a.sec),
  }))
}

/** 纵轴刻度文案（分钟为主） */
export function formatAxisDuration(sec: number): string {
  if (sec <= 0) return '0'
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}分`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h}时${rm}分` : `${h}时`
}

export function totalActiveSecondsWindow(day: Date, events: AwEvent[]): number {
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  let s = 0
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const start = parseIso(ev.timestamp)
    const end = start + ev.duration * 1000
    const clipStart = Math.max(start, t0)
    const clipEnd = Math.min(end, t1)
    if (clipEnd > clipStart) s += (clipEnd - clipStart) / 1000
  }
  return Math.round(s)
}

/**
 * 当日窗口累计秒数。采集中若当前前台与「时间戳最新」的那条事件为同一应用，
 * 则把该段在当日内的结束时间延伸到 `nowMs`（心跳尚未写入 DB 时秒数仍会涨）。
 */
export function totalActiveSecondsWindowLive(
  day: Date,
  events: AwEvent[],
  live: LiveForegroundSample | null,
  nowMs: number,
  extrapolate: boolean,
): number {
  const base = totalActiveSecondsWindow(day, events)
  if (!extrapolate || !live) return base

  if (isLiveForegroundSkippedForStats(live)) {
    return base
  }

  const statsEvents = events.filter((e) => !shouldSkipWindowEventForStats(e))
  const latest = findLatestWindowEvent(statsEvents)
  if (latest && sameForegroundApp(latest.data, live)) {
    return extrapolateWindowEventToNow(day, base, latest, nowMs, live)
  }

  const latestForApp = findLatestWindowEventForApp(statsEvents, live)
  if (latestForApp) {
    return extrapolateWindowEventToNow(day, base, latestForApp, nowMs, live)
  }

  return base + liveForegroundSegmentSec(day, live, nowMs)
}

/**
 * 当前前台若与「当日最新一条窗口事件」为同一应用，则返回该事件及其已连续停留秒数
 *（含心跳尚未落库、延伸到 `nowMs` 的部分）。用于连续使用时长提示等。
 */
export function currentForegroundSegmentLive(
  events: AwEvent[],
  live: LiveForegroundSample | null,
  nowMs: number,
  extrapolate: boolean,
): { event: AwEvent | null; seconds: number } {
  if (!extrapolate || !live || isLiveForegroundSkippedForStats(live)) {
    return { event: null, seconds: 0 }
  }

  const statsEvents = events.filter((e) => !shouldSkipWindowEventForStats(e))
  const latest = findLatestWindowEvent(statsEvents)
  if (!latest || !sameForegroundApp(latest.data, live)) return { event: null, seconds: 0 }

  const segStart = live.segmentStartedAt
    ? parseIso(live.segmentStartedAt)
    : parseIso(latest.timestamp)
  return { event: latest, seconds: Math.max(0, Math.round((nowMs - segStart) / 1000)) }
}

export type AppTotalRow = {
  /** 进程名（图标匹配） */
  app: string
  displayName: string
  identityKey: string
  seconds: number
  appPath?: string
}

export function appTotalsForDay(day: Date, events: AwEvent[]): AppTotalRow[] {
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  const map = new Map<
    string,
    { seconds: number; appPath?: string; app: string; displayName: string }
  >()
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const id = identityFromEventData(ev.data)
    const start = parseIso(ev.timestamp)
    const end = start + ev.duration * 1000
    const clipStart = Math.max(start, t0)
    const clipEnd = Math.min(end, t1)
    if (clipEnd <= clipStart) continue
    const add = (clipEnd - clipStart) / 1000
    const prev = map.get(id.identityKey) ?? {
      seconds: 0,
      app: id.processApp,
      displayName: id.displayName,
    }
    prev.seconds += add
    const ap = String(ev.data.appPath ?? '').trim()
    if (ap && !prev.appPath) prev.appPath = ap
    map.set(id.identityKey, prev)
  }
  return [...map.entries()]
    .map(([identityKey, v]) => ({
      app: v.app,
      displayName: v.displayName,
      identityKey,
      seconds: Math.round(v.seconds),
      ...(v.appPath ? { appPath: v.appPath } : {}),
    }))
    .sort((a, b) => b.seconds - a.seconds)
}

/** 整周各应用前台时长合计（周一至周日） */
export function appTotalsForWeek(weekStartMonday: Date, events: AwEvent[]): AppTotalRow[] {
  const map = new Map<
    string,
    { seconds: number; appPath?: string; app: string; displayName: string }
  >()
  for (const day of daysInLocalWeek(startOfWeekMondayLocal(weekStartMonday))) {
    for (const row of appTotalsForDay(day, events)) {
      const prev = map.get(row.identityKey) ?? {
        seconds: 0,
        app: row.app,
        displayName: row.displayName,
        appPath: row.appPath,
      }
      prev.seconds += row.seconds
      if (row.appPath && !prev.appPath) prev.appPath = row.appPath
      map.set(row.identityKey, prev)
    }
  }
  return [...map.entries()]
    .map(([identityKey, v]) => ({
      app: v.app,
      displayName: v.displayName,
      identityKey,
      seconds: Math.round(v.seconds),
      ...(v.appPath ? { appPath: v.appPath } : {}),
    }))
    .sort((a, b) => b.seconds - a.seconds)
}

/** Per-hour activity (seconds) by event **start** time — lightweight viz. */
export function hourBinsByEventStart(day: Date, events: AwEvent[]): number[] {
  const bins = Array.from({ length: 24 }, () => 0)
  const t0 = startOfLocalDay(day).getTime()
  const t1 = endOfLocalDay(day).getTime()
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const start = parseIso(ev.timestamp)
    if (start < t0 || start > t1) continue
    const h = new Date(start).getHours()
    bins[h] += ev.duration
  }
  return bins.map((s) => Math.round(s))
}

export function browserTotalsForDay(
  day: Date,
  events: AwEvent[],
): { host: string; seconds: number; sampleTitle: string }[] {
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  const map = new Map<string, { seconds: number; sampleTitle: string }>()
  for (const ev of events) {
    const url = String(ev.data.url ?? '')
    let host = 'local/other'
    try {
      if (url) host = new URL(url).hostname
    } catch {
      host = url.slice(0, 40) || 'local/other'
    }
    const start = parseIso(ev.timestamp)
    const end = start + ev.duration * 1000
    const clipStart = Math.max(start, t0)
    const clipEnd = Math.min(end, t1)
    if (clipEnd <= clipStart) continue
    const prev = map.get(host) ?? { seconds: 0, sampleTitle: '' }
    prev.seconds += (clipEnd - clipStart) / 1000
    if (!prev.sampleTitle && ev.data.title)
      prev.sampleTitle = String(ev.data.title)
    map.set(host, prev)
  }
  return [...map.entries()]
    .map(([host, v]) => ({
      host,
      seconds: Math.round(v.seconds),
      sampleTitle: v.sampleTitle,
    }))
    .sort((a, b) => b.seconds - a.seconds)
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} 秒`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h} 小时 ${rm} 分` : `${h} 小时`
}

/** 列表简短时长：≥1 小时为「x时x分」，否则 ≥1 分为「x分x秒」，否则「x秒」 */
export function formatDurationCompactSec(totalSec: number): string {
  const s0 = Math.max(0, Math.round(totalSec))
  if (s0 < 60) return `${s0}秒`
  const h = Math.floor(s0 / 3600)
  const m = Math.floor((s0 % 3600) / 60)
  const sec = s0 % 60
  if (h > 0) return `${h}时${m}分`
  return `${m}分${sec}秒`
}

/** 中文时长，精确到秒、无空格（如 `5分30秒`、`2小时5分30秒`） */
export function formatDurationPreciseSec(totalSec: number): string {
  const s0 = Math.max(0, Math.round(totalSec))
  if (s0 < 60) return `${s0}秒`
  const h = Math.floor(s0 / 3600)
  const m = Math.floor((s0 % 3600) / 60)
  const sec = s0 % 60
  if (h > 0) return `${h}小时${m}分${sec}秒`
  return `${m}分${sec}秒`
}

/** 秒 → `N小时N分钟N秒` */
export function formatDurationHmsZh(totalSec: number): string {
  const s0 = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s0 / 3600)
  const m = Math.floor((s0 % 3600) / 60)
  const sec = s0 % 60
  return `${h}小时${m}分钟${sec}秒`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 秒 → `00小时00分钟00秒`（时分秒各两位，用于今日办公总时长等实时计时） */
export function formatDurationHmsZhFixed(totalSec: number): string {
  const s0 = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s0 / 3600)
  const m = Math.floor((s0 % 3600) / 60)
  const sec = s0 % 60
  return `${pad2(h)}小时${pad2(m)}分钟${pad2(sec)}秒`
}

export function totalSecondsWindowEvents(events: AwEvent[]): number {
  let s = 0
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    s += ev.duration
  }
  return Math.round(s)
}

export function appTotalsFromWindowEvents(events: AwEvent[]): {
  app: string
  seconds: number
  appPath?: string
}[] {
  const map = new Map<string, { seconds: number; appPath?: string }>()
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const app = String(ev.data.app ?? 'unknown')
    const prev = map.get(app) ?? { seconds: 0 }
    prev.seconds += ev.duration
    const ap = String(ev.data.appPath ?? '').trim()
    if (ap && !prev.appPath) prev.appPath = ap
    map.set(app, prev)
  }
  return [...map.entries()]
    .map(([app, v]) => ({
      app,
      seconds: Math.round(v.seconds),
      ...(v.appPath ? { appPath: v.appPath } : {}),
    }))
    .sort((a, b) => b.seconds - a.seconds)
}

export function recentWindowRows(
  day: Date,
  events: AwEvent[],
  limit: number,
): {
  id: string
  time: string
  /** Display name (basename, no .exe). */
  title: string
  /** Original app field for icon lookup. */
  appFile: string
  /** 完整路径，用于 Electron 取系统图标 */
  appPath: string
  subtitle: string
  duration: string
  accent: 'gold' | 'sky' | 'mint' | 'coral'
}[] {
  const day0 = startOfLocalDay(day)
  const day1 = endOfLocalDay(day)
  const t0 = day0.getTime()
  const t1 = day1.getTime()
  const acc: AwEvent[] = []
  for (const ev of events) {
    const start = parseIso(ev.timestamp)
    const end = start + ev.duration * 1000
    if (end > t0 && start < t1) acc.push(ev)
  }
  acc.sort((a, b) => parseIso(b.timestamp) - parseIso(a.timestamp))
  const filtered = acc.filter((ev) => !shouldSkipWindowEventForStats(ev))
  const accents = ['mint', 'sky', 'gold', 'coral'] as const
  return filtered.slice(0, limit).map((ev, i) => ({
    id: ev.id,
    time: formatClock(new Date(parseIso(ev.timestamp))),
    title: String(ev.data.app ?? '应用').replace(/\.exe$/i, ''),
    appFile: String(ev.data.app ?? ''),
    appPath: String(ev.data.appPath ?? '').trim(),
    subtitle: String(ev.data.title ?? ''),
    duration: formatDuration(ev.duration),
    accent: accents[i % accents.length],
  }))
}
