import type { AwEvent } from './awTypes'
import type { AppCategoryDef } from './appCategoryConfig'
import { UNCATEGORIZED_ID } from './appCategoryConfig'
import { aggregateByAppCategories } from './appCategoryAggregate'
import {
  appTotalsFromWindowEvents,
  totalActiveSecondsWindow,
  totalSecondsWindowEvents,
} from './aggregations'
import {
  sumOfficeElapsedForMonthThrough,
  sumOfficeElapsedForMonthWeekBlock,
  officeElapsedForDay,
  type OfficeElapsedContext,
} from './officeElapsed'
import type { LiveForegroundSample } from './liveForeground'
import { categoryChartColor } from './categoryBarColors'
import { excludeGanshaleSelfWindowEvents, shouldSkipWindowEventForStats } from './selfWindowFilter'
import {
  compareLocalCalendarDay,
  daysInLocalWeek,
  endOfLocalDay,
  endOfWeekSundayLocal,
  parseIso,
  parseYmdLocal,
  startOfLocalDay,
  startOfMonthLocal,
  endOfMonthLocal,
  startOfWeekMondayLocal,
  toYmdLocal,
  WEEKDAY_ZH,
} from './timeutil'
import {
  addWeeksMondayLocal,
  formatCompareDeltaAbsZh,
  isoWeekNumberLocal,
  type WeekCompareTone,
} from './weeklyWorktime'
import * as store from './idbStore'
import { BUCKET_WINDOW } from './seed'

export type IntensityTier = 0 | 1 | 2 | 3 | 4

export const HOUR_BANDS = [
  { label: '0–4', start: 0, end: 4 },
  { label: '4–8', start: 4, end: 8 },
  { label: '8–12', start: 8, end: 12 },
  { label: '12–14', start: 12, end: 14 },
  { label: '14–18', start: 14, end: 18 },
  { label: '18–22', start: 18, end: 22 },
  { label: '22–24', start: 22, end: 24 },
] as const

const EFFECTIVE_WORKDAY_MIN_SEC = 3600

export function addMonthsLocal(d: Date, delta: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + delta, 1)
  x.setHours(12, 0, 0, 0)
  return x
}

export function daysInLocalMonth(monthAnchor: Date): Date[] {
  const start = startOfMonthLocal(monthAnchor)
  const end = endOfMonthLocal(monthAnchor)
  const out: Date[] = []
  const cur = new Date(start)
  cur.setHours(12, 0, 0, 0)
  while (cur <= end) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export function compareLocalCalendarMonth(
  monthAnchor: Date,
  reference = new Date(),
): 'past' | 'current' | 'future' {
  const a = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, '0')}`
  const b = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`
  if (a < b) return 'past'
  if (a > b) return 'future'
  return 'current'
}

/**
 * 一次性预分区：将事件按本地日期分桶，避免后续上百次 `windowEventsForLocalDay` 全量扫描。
 * 返回 `Map<YYYY-MM-DD, AwEvent[]>`。
 */
export function partitionEventsByDay(events: readonly AwEvent[]): Map<string, AwEvent[]> {
  const map = new Map<string, AwEvent[]>()
  for (const ev of events) {
    if (shouldSkipWindowEventForStats(ev)) continue
    const ts = parseIso(ev.timestamp)
    if (Number.isNaN(ts)) continue
    const ymd = toYmdLocal(new Date(ts))
    const arr = map.get(ymd)
    if (arr) arr.push(ev)
    else map.set(ymd, [ev])
  }
  return map
}

export function formatMonthPickerLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

export function intensityTierFromSeconds(seconds: number): IntensityTier {
  if (seconds <= 0) return 0
  const h = seconds / 3600
  if (h < 1) return 1
  if (h < 3) return 2
  if (h < 7) return 3
  return 4
}

function monthEventsCacheKey(monthAnchor: Date): string {
  const m = startOfMonthLocal(monthAnchor)
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
}

const windowEventsForMonthCache = new Map<string, AwEvent[]>()

export function peekCachedWindowEventsForMonth(monthAnchor: Date): AwEvent[] | undefined {
  return windowEventsForMonthCache.get(monthEventsCacheKey(monthAnchor))
}

export function invalidateMonthlyWindowEventsCache(): void {
  windowEventsForMonthCache.clear()
}

export type LoadMonthEventsOptions = {
  /** 跳过内存缓存，强制从 IndexedDB 读取 */
  force?: boolean
}

export async function loadWindowEventsForMonth(
  monthAnchor: Date,
  options: LoadMonthEventsOptions = {},
): Promise<AwEvent[]> {
  const key = monthEventsCacheKey(monthAnchor)
  if (!options.force) {
    const cached = windowEventsForMonthCache.get(key)
    if (cached) return cached
  }

  const start = startOfMonthLocal(monthAnchor).toISOString()
  const end = endOfMonthLocal(monthAnchor).toISOString()
  const rows = await store.getEventsInRange(BUCKET_WINDOW, start, end)
  const events = excludeGanshaleSelfWindowEvents(rows)
  windowEventsForMonthCache.set(key, events)
  return events
}

/** 预取当月与上月窗口事件（导航悬停或应用启动时调用） */
export function prefetchMonthlyWindowEvents(monthAnchor = startOfMonthLocal(new Date())): void {
  void loadWindowEventsForMonth(monthAnchor)
  void loadWindowEventsForMonth(addMonthsLocal(monthAnchor, -1))
}

function elapsedDaysInMonth(monthAnchor: Date, now: Date): number {
  const kind = compareLocalCalendarMonth(monthAnchor, now)
  const all = daysInLocalMonth(monthAnchor).length
  if (kind === 'past') return all
  if (kind === 'future') return 0
  return Math.max(1, now.getDate())
}

function percentDelta(current: number, prev: number): number | null {
  if (prev <= 0) return null
  return Math.round(((current - prev) / prev) * 100)
}

export function formatMonthOverMonthCompare(
  currentSec: number,
  prevSec: number,
): { line: string; tone: WeekCompareTone } {
  if (prevSec <= 0 && currentSec <= 0) {
    return { line: '较上月暂无对比数据', tone: 'none' }
  }
  const delta = currentSec - prevSec
  const absLabel = formatCompareDeltaAbsZh(Math.abs(delta))
  const pct = percentDelta(currentSec, prevSec)
  const pctLabel =
    pct != null && delta !== 0
      ? pct > 0
        ? `+${pct}%`
        : `${pct}%`
      : pct === 0
        ? '0%'
        : null

  if (delta === 0) {
    const suffix = pctLabel != null ? ` (${pctLabel})` : ''
    return { line: `较上月 ${absLabel}${suffix}`, tone: 'flat' }
  }
  const sign = delta > 0 ? '+' : '-'
  const suffix = pctLabel != null ? ` (${pctLabel})` : ''
  return {
    line: `较上月 ${sign}${absLabel}${suffix}`,
    tone: delta > 0 ? 'up' : 'down',
  }
}

export type MonthlyDayCell = {
  date: string
  dayOfMonth: number
  weekday: number
  seconds: number
  intensityTier: IntensityTier
  isToday: boolean
  isFuture: boolean
  isOutsideMonth: boolean
}

export type MonthlyCategoryRow = {
  categoryId: string
  label: string
  seconds: number
  percent: number
  color: string
  vsLastMonthPercentDelta: number | null
}

export type MonthlyTopAppRow = {
  app: string
  label: string
  seconds: number
  vsLastMonthPercentDelta: number | null
}

export type MonthlyPeakEfficientBand = {
  /** 与热力图一致的区间标签，如 `14–18` */
  label: string
  /** 展示用，如 `14:00–18:00` */
  displayLabel: string
  startHour: number
  endHour: number
  seconds: number
  percentOfMonth: number
}

export type MonthlySummary = {
  monthKey: string
  /** 当月全部窗口事件时长（内部分析用） */
  totalFocusSeconds: number
  /** 本月展示的四周块时长累加（与周块卡片一致） */
  weekBlocksTotalSeconds: number
  dailyAvgSeconds: number
  peakEfficientBand: MonthlyPeakEfficientBand | null
  vsLastMonthTotal: { line: string; tone: WeekCompareTone; deltaSec: number; pct: number | null }
  vsLastMonthWeekBlocksTotal: {
    line: string
    tone: WeekCompareTone
    deltaSec: number
    pct: number | null
  }
  peakDay: { date: string; weekdayLabel: string; seconds: number } | null
  effectiveWorkDays: { count: number; totalDays: number; targetDays: number }
  categories: MonthlyCategoryRow[]
  topApps: MonthlyTopAppRow[]
  calendarCells: MonthlyDayCell[]
  heatmap: {
    bands: readonly string[]
    cells: { day: number; band: number; seconds: number }[]
    maxSeconds: number
  }
  vsLastMonthCategories: Array<{
    categoryId: string
    label: string
    thisMonthPercent: number
    lastMonthPercent: number
  }>
}

function aggregateCategoriesForMonth(
  monthAnchor: Date,
  dayEventsMap: Map<string, AwEvent[]>,
  categories: AppCategoryDef[],
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const c of categories) totals.set(c.id, 0)
  totals.set(UNCATEGORIZED_ID, 0)
  for (const day of daysInLocalMonth(monthAnchor)) {
    const dayEvents = dayEventsMap.get(toYmdLocal(day))
    if (!dayEvents || dayEvents.length === 0) continue
    const agg = aggregateByAppCategories(day, dayEvents, categories)
    for (const [id, bucket] of Object.entries(agg.buckets)) {
      totals.set(id, (totals.get(id) ?? 0) + bucket.seconds)
    }
  }
  return totals
}

function clipEventToDayBand(ev: AwEvent, day: Date, bandStart: number, bandEnd: number): number {
  const day0 = startOfLocalDay(day).getTime()
  const day1 = endOfLocalDay(day).getTime()
  const start = parseIso(ev.timestamp)
  const end = start + ev.duration * 1000
  const clipStart = Math.max(start, day0)
  const clipEnd = Math.min(end, day1)
  if (clipEnd <= clipStart) return 0
  const bandStartMs = day0 + bandStart * 3600_000
  const bandEndMs = day0 + bandEnd * 3600_000
  const overlapStart = Math.max(clipStart, bandStartMs)
  const overlapEnd = Math.min(clipEnd, bandEndMs)
  if (overlapEnd <= overlapStart) return 0
  return (overlapEnd - overlapStart) / 1000
}

export function formatEfficientBandDisplay(startHour: number, endHour: number): string {
  const pad = (h: number) => String(h).padStart(2, '0')
  return `${pad(startHour)}:00–${pad(endHour)}:00`
}

function buildPeakEfficientBand(
  monthAnchor: Date,
  dayEventsMap: Map<string, AwEvent[]>,
  totalFocusSeconds: number,
): MonthlyPeakEfficientBand | null {
  const bandTotals = HOUR_BANDS.map(() => 0)
  for (const day of daysInLocalMonth(monthAnchor)) {
    const dayEvents = dayEventsMap.get(toYmdLocal(day))
    if (!dayEvents || dayEvents.length === 0) continue
    for (const ev of dayEvents) {
      HOUR_BANDS.forEach((band, i) => {
        bandTotals[i] += clipEventToDayBand(ev, day, band.start, band.end)
      })
    }
  }

  let bestIndex = -1
  let bestSec = 0
  bandTotals.forEach((sec, i) => {
    const rounded = Math.round(sec)
    if (rounded > bestSec) {
      bestSec = rounded
      bestIndex = i
    }
  })

  if (bestIndex < 0 || bestSec <= 0) return null
  const band = HOUR_BANDS[bestIndex]!
  return {
    label: band.label,
    displayLabel: formatEfficientBandDisplay(band.start, band.end),
    startHour: band.start,
    endHour: band.end,
    seconds: bestSec,
    percentOfMonth:
      totalFocusSeconds > 0 ? Math.round((bestSec / totalFocusSeconds) * 100) : 0,
  }
}

function buildHeatmap(monthAnchor: Date, dayEventsMap: Map<string, AwEvent[]>) {
  const cells: { day: number; band: number; seconds: number }[] = []
  let maxSeconds = 0
  for (const day of daysInLocalMonth(monthAnchor)) {
    const dayIndex = day.getDate() - 1
    const dayEvents = dayEventsMap.get(toYmdLocal(day))
    HOUR_BANDS.forEach((band, bandIndex) => {
      let sec = 0
      if (dayEvents) {
        for (const ev of dayEvents) {
          sec += clipEventToDayBand(ev, day, band.start, band.end)
        }
      }
      sec = Math.round(sec)
      if (sec > maxSeconds) maxSeconds = sec
      cells.push({ day: dayIndex, band: bandIndex, seconds: sec })
    })
  }
  return {
    bands: HOUR_BANDS.map((b) => b.label),
    cells,
    maxSeconds: Math.max(1, maxSeconds),
  }
}

function emptyCell(d: Date, isOutsideMonth: boolean, now: Date): MonthlyDayCell {
  return {
    date: toYmdLocal(d),
    dayOfMonth: d.getDate(),
    weekday: d.getDay(),
    seconds: 0,
    intensityTier: 0,
    isToday: toYmdLocal(d) === toYmdLocal(now),
    isFuture: compareLocalCalendarDay(d, now) === 'future',
    isOutsideMonth,
  }
}

function buildCalendarGrid(
  monthAnchor: Date,
  daySeconds: Map<string, number>,
  now: Date,
): MonthlyDayCell[] {
  const monthStart = startOfMonthLocal(monthAnchor)
  const monthEnd = endOfMonthLocal(monthAnchor)
  const firstDow = monthStart.getDay()
  const leading = firstDow === 0 ? 6 : firstDow - 1
  const cells: MonthlyDayCell[] = []

  for (let i = leading; i > 0; i--) {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - i)
    d.setHours(12, 0, 0, 0)
    cells.push(emptyCell(d, true, now))
  }

  for (const day of daysInLocalMonth(monthAnchor)) {
    const ymd = toYmdLocal(day)
    const sec = daySeconds.get(ymd) ?? 0
    cells.push({
      date: ymd,
      dayOfMonth: day.getDate(),
      weekday: day.getDay(),
      seconds: sec,
      intensityTier: intensityTierFromSeconds(sec),
      isToday: toYmdLocal(day) === toYmdLocal(now),
      isFuture: compareLocalCalendarDay(day, now) === 'future',
      isOutsideMonth: false,
    })
  }

  const tail = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= tail; i++) {
    const d = new Date(monthEnd)
    d.setDate(d.getDate() + i)
    d.setHours(12, 0, 0, 0)
    cells.push(emptyCell(d, true, now))
  }

  return cells
}

export function buildMonthlySummary(
  monthAnchor: Date,
  events: AwEvent[],
  prevEvents: AwEvent[],
  categories: AppCategoryDef[],
  now = new Date(),
  patterns: string[] = [],
): MonthlySummary {
  const monthKey = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, '0')}`

  // 核心优化：一次性预分区，后续所有计算复用，避免数百次全量扫描
  const dayEventsMap = partitionEventsByDay(events)
  const prevDayEventsMap = partitionEventsByDay(prevEvents)

  const staticCtx = {
    patterns,
    live: null,
    nowMs: now.getTime(),
    extrapolateLive: false,
  } satisfies OfficeElapsedContext

  // 逐日办公时长 + 峰值日 + 有效工作日（一次遍历）
  const daySeconds = new Map<string, number>()
  let effectiveCount = 0
  let peakDay: MonthlySummary['peakDay'] = null

  for (const day of daysInLocalMonth(monthAnchor)) {
    const ymd = toYmdLocal(day)
    const dayEvents = dayEventsMap.get(ymd) ?? []
    const sec = officeElapsedForDay(day, dayEvents, staticCtx)
    daySeconds.set(ymd, sec)
    if (sec >= EFFECTIVE_WORKDAY_MIN_SEC) effectiveCount += 1
    if (!peakDay || sec > peakDay.seconds) {
      peakDay = {
        date: ymd,
        weekdayLabel: WEEKDAY_ZH[day.getDay()] ?? '',
        seconds: sec,
      }
    }
  }
  if (peakDay && peakDay.seconds <= 0) peakDay = null

  const totalFocusSeconds = totalSecondsWindowEvents(events)
  const prevTotal = totalSecondsWindowEvents(prevEvents)
  const elapsed = elapsedDaysInMonth(monthAnchor, now)
  const dailyAvgSeconds = elapsed > 0 ? Math.round(totalFocusSeconds / elapsed) : 0

  const peakEfficientBand = buildPeakEfficientBand(monthAnchor, dayEventsMap, totalFocusSeconds)

  const curCat = aggregateCategoriesForMonth(monthAnchor, dayEventsMap, categories)
  const prevCat = aggregateCategoriesForMonth(addMonthsLocal(monthAnchor, -1), prevDayEventsMap, categories)
  const catTotal = [...curCat.values()].reduce((a, b) => a + b, 0)

  const categoryRows: MonthlyCategoryRow[] = categories
    .map((c, i) => {
      const seconds = curCat.get(c.id) ?? 0
      const prevSec = prevCat.get(c.id) ?? 0
      return {
        categoryId: c.id,
        label: c.name,
        seconds,
        percent: catTotal > 0 ? (seconds / catTotal) * 100 : 0,
        color: categoryChartColor(c.id, i),
        vsLastMonthPercentDelta: percentDelta(seconds, prevSec),
      }
    })
    .filter((r) => r.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)

  const uncSec = curCat.get(UNCATEGORIZED_ID) ?? 0
  if (uncSec > 0) {
    const prevUnc = prevCat.get(UNCATEGORIZED_ID) ?? 0
    categoryRows.push({
      categoryId: UNCATEGORIZED_ID,
      label: '未分类',
      seconds: uncSec,
      percent: catTotal > 0 ? (uncSec / catTotal) * 100 : 0,
      color: categoryChartColor(UNCATEGORIZED_ID, categoryRows.length),
      vsLastMonthPercentDelta: percentDelta(uncSec, prevUnc),
    })
    categoryRows.sort((a, b) => b.seconds - a.seconds)
  }

  const curApps = appTotalsFromWindowEvents(events)
  const prevAppMap = new Map(appTotalsFromWindowEvents(prevEvents).map((r) => [r.app, r.seconds]))

  const topApps: MonthlyTopAppRow[] = curApps.slice(0, 5).map((r) => ({
    app: r.app,
    label: r.app.replace(/\.exe$/i, ''),
    seconds: r.seconds,
    vsLastMonthPercentDelta: percentDelta(r.seconds, prevAppMap.get(r.app) ?? 0),
  }))

  const vsLastMonthCategories = categoryRows.map((r) => {
    const prevSec = prevCat.get(r.categoryId) ?? 0
    const prevTotalCat = [...prevCat.values()].reduce((a, b) => a + b, 0)
    return {
      categoryId: r.categoryId,
      label: r.label,
      thisMonthPercent: r.percent,
      lastMonthPercent: prevTotalCat > 0 ? (prevSec / prevTotalCat) * 100 : 0,
    }
  })

  const totalDays = daysInLocalMonth(monthAnchor).length
  const vsCompare = formatMonthOverMonthCompare(totalFocusSeconds, prevTotal)
  const calendarCells = buildCalendarGrid(monthAnchor, daySeconds, now)
  const weekBlocksTotalSeconds = sumMonthWeekBlockSeconds(monthAnchor, calendarCells)

  // 上月周块合计（复用 prevDayEventsMap）
  const prevMonthAnchor = addMonthsLocal(monthAnchor, -1)
  const prevDaySeconds = new Map<string, number>()
  for (const day of daysInLocalMonth(prevMonthAnchor)) {
    const ymd = toYmdLocal(day)
    const prevDayEvents = prevDayEventsMap.get(ymd) ?? []
    prevDaySeconds.set(ymd, officeElapsedForDay(day, prevDayEvents, staticCtx))
  }
  const prevWeekBlocksTotal = sumMonthWeekBlockSeconds(
    prevMonthAnchor,
    buildCalendarGrid(prevMonthAnchor, prevDaySeconds, now),
  )
  const vsWeekBlocksCompare = formatMonthOverMonthCompare(
    weekBlocksTotalSeconds,
    prevWeekBlocksTotal,
  )

  return {
    monthKey,
    totalFocusSeconds,
    weekBlocksTotalSeconds,
    dailyAvgSeconds,
    peakEfficientBand,
    vsLastMonthTotal: {
      ...vsCompare,
      deltaSec: totalFocusSeconds - prevTotal,
      pct: percentDelta(totalFocusSeconds, prevTotal),
    },
    vsLastMonthWeekBlocksTotal: {
      ...vsWeekBlocksCompare,
      deltaSec: weekBlocksTotalSeconds - prevWeekBlocksTotal,
      pct: percentDelta(weekBlocksTotalSeconds, prevWeekBlocksTotal),
    },
    peakDay,
    effectiveWorkDays: {
      count: effectiveCount,
      totalDays,
      targetDays: totalDays,
    },
    categories: categoryRows,
    topApps,
    calendarCells,
    heatmap: buildHeatmap(monthAnchor, dayEventsMap),
    vsLastMonthCategories,
  }
}

export function formatMonthDayShort(ymd: string): string {
  const d = parseYmdLocal(ymd)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function formatHoursCompact(seconds: number): string {
  const h = seconds / 3600
  if (h < 0.1 && seconds > 0) return '<0.1h'
  return `${h.toFixed(1)}h`
}

export type MonthWeekBlock = {
  weekStart: Date
  weekNo: number
  weekKey: string
  rangeLabel: string
}

function formatWeekRangeShort(weekStartMonday: Date): string {
  const days = daysInLocalWeek(weekStartMonday)
  const mon = days[0]!
  const sun = days[6]!
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${fmt(mon)} - ${fmt(sun)}`
}

/** 本月展示用的 4 个周块（优先选取与当月重叠天数最多的周） */
export function pickMonthWeekBlocks(monthAnchor: Date): MonthWeekBlock[] {
  const first = startOfMonthLocal(monthAnchor)
  const last = endOfMonthLocal(monthAnchor)
  let mon = startOfWeekMondayLocal(first)
  const candidates: { weekStart: Date; inMonthDays: number }[] = []
  const seen = new Set<string>()

  while (candidates.length < 6) {
    const sunday = endOfWeekSundayLocal(mon)
    if (mon > last && sunday > last) break
    const key = toYmdLocal(mon)
    if (!seen.has(key)) {
      seen.add(key)
      let inMonthDays = 0
      for (const d of daysInLocalWeek(mon)) {
        if (d >= first && d <= last) inMonthDays += 1
      }
      candidates.push({ weekStart: startOfWeekMondayLocal(mon), inMonthDays })
    }
    mon = addWeeksMondayLocal(mon, 1)
  }

  if (candidates.length === 0) {
    candidates.push({
      weekStart: startOfWeekMondayLocal(monthAnchor),
      inMonthDays: 0,
    })
  }

  let picked = candidates
  if (candidates.length > 4) {
    picked = [...candidates]
      .sort((a, b) => b.inMonthDays - a.inMonthDays)
      .slice(0, 4)
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
  } else if (candidates.length < 4) {
    const out = [...candidates]
    while (out.length < 4) {
      const prev = addWeeksMondayLocal(out[0]!.weekStart, -1)
      out.unshift({ weekStart: prev, inMonthDays: 0 })
    }
    picked = out.slice(0, 4)
  }

  return picked.map(({ weekStart }) => {
    const weekNo = isoWeekNumberLocal(weekStart)
    return {
      weekStart,
      weekNo,
      weekKey: toYmdLocal(weekStart),
      rangeLabel: formatWeekRangeShort(weekStart),
    }
  })
}

export function monthSecondsForWeekFromCells(
  cells: readonly MonthlyDayCell[],
  weekStart: Date,
): number {
  const key = toYmdLocal(startOfWeekMondayLocal(weekStart))
  let sec = 0
  for (const cell of cells) {
    if (cell.isOutsideMonth) continue
    const ws = toYmdLocal(startOfWeekMondayLocal(parseYmdLocal(cell.date)))
    if (ws === key) sec += cell.seconds
  }
  return sec
}

export function sumMonthWeekBlockSeconds(
  monthAnchor: Date,
  cells: readonly MonthlyDayCell[],
): number {
  return pickMonthWeekBlocks(monthAnchor).reduce(
    (sum, block) => sum + monthSecondsForWeekFromCells(cells, block.weekStart),
    0,
  )
}

function sumMonthWeekBlockSecondsFromEvents(
  monthAnchor: Date,
  weekStart: Date,
  events: AwEvent[],
  patterns: string[],
  now: Date,
  live: LiveForegroundSample | null,
  extrapolateToday: boolean,
): number {
  const first = startOfMonthLocal(monthAnchor)
  const last = endOfMonthLocal(monthAnchor)
  const ctx: OfficeElapsedContext = {
    patterns,
    live,
    nowMs: now.getTime(),
    extrapolateLive: extrapolateToday,
  }
  return sumOfficeElapsedForMonthWeekBlock(first, last, weekStart, events, ctx)
}

/** 本月 KPI 总活跃：四周块累加（与每日/每周同源算法；已完成周块固定 + 本周 live） */
export function computeMonthWeekBlocksTotalLive(
  monthAnchor: Date,
  events: AwEvent[],
  patterns: string[],
  fixedCells: readonly MonthlyDayCell[],
  now = new Date(),
  live: LiveForegroundSample | null = null,
  extrapolateToday = false,
): number {
  const blocks = pickMonthWeekBlocks(monthAnchor)
  const isCurrentMonth = compareLocalCalendarMonth(monthAnchor, now) === 'current'
  const currentWeekKey = toYmdLocal(startOfWeekMondayLocal(now))

  return blocks.reduce((sum, block) => {
    const isCurrentWeek = isCurrentMonth && block.weekKey === currentWeekKey

    if (isCurrentWeek && extrapolateToday) {
      return (
        sum +
        sumMonthWeekBlockSecondsFromEvents(
          monthAnchor,
          block.weekStart,
          events,
          patterns,
          now,
          live,
          true,
        )
      )
    }

    return sum + monthSecondsForWeekFromCells(fixedCells, block.weekStart)
  }, 0)
}

/** 本月 1 号至参考日（含）的办公时长；与每日页逐日累加一致 */
export function sumMonthDaysThroughReference(
  monthAnchor: Date,
  events: AwEvent[],
  patterns: string[],
  now = new Date(),
  live: LiveForegroundSample | null = null,
  extrapolateToday = false,
): number {
  return sumOfficeElapsedForMonthThrough(daysInLocalMonth(monthAnchor), events, {
    patterns,
    live,
    nowMs: now.getTime(),
    extrapolateLive: extrapolateToday,
  })
}

/** 整月活跃时长（上月环比分母等） */
export function sumMonthFullActiveSeconds(monthAnchor: Date, events: AwEvent[]): number {
  const dayMap = partitionEventsByDay(events)
  let total = 0
  for (const day of daysInLocalMonth(monthAnchor)) {
    total += totalActiveSecondsWindow(day, dayMap.get(toYmdLocal(day)) ?? [])
  }
  return total
}

export type MonthlyLiveKpi = {
  weekBlocksTotalSeconds: number
  vsLastMonthWeekBlocksTotal: MonthlySummary['vsLastMonthWeekBlocksTotal']
  live: boolean
}

export function buildMonthlyLiveKpi(
  monthAnchor: Date,
  events: AwEvent[],
  prevEvents: AwEvent[],
  fixedCells: readonly MonthlyDayCell[],
  options: {
    patterns?: string[]
    now?: Date
    live?: LiveForegroundSample | null
    extrapolateToday?: boolean
  } = {},
): MonthlyLiveKpi {
  const patterns = options.patterns ?? []
  const now = options.now ?? new Date()
  const live = options.live ?? null
  const extrapolateToday = options.extrapolateToday ?? false
  const monthKind = compareLocalCalendarMonth(monthAnchor, now)

  const weekBlocksTotalSeconds =
    monthKind === 'future'
      ? 0
      : computeMonthWeekBlocksTotalLive(
          monthAnchor,
          events,
          patterns,
          fixedCells,
          now,
          live,
          extrapolateToday,
        )

  const currentCompareSec =
    monthKind === 'future'
      ? 0
      : monthKind === 'past'
        ? sumMonthFullActiveSeconds(monthAnchor, events)
        : sumMonthDaysThroughReference(
            monthAnchor,
            events,
            patterns,
            now,
            live,
            extrapolateToday,
          )

  const prevCompareSec = sumMonthFullActiveSeconds(
    addMonthsLocal(monthAnchor, -1),
    prevEvents,
  )

  const vsCompare = formatMonthOverMonthCompare(currentCompareSec, prevCompareSec)

  return {
    weekBlocksTotalSeconds,
    vsLastMonthWeekBlocksTotal: {
      ...vsCompare,
      deltaSec: currentCompareSec - prevCompareSec,
      pct: percentDelta(currentCompareSec, prevCompareSec),
    },
    live: monthKind === 'current' && extrapolateToday,
  }
}

export function monthSecondsForWeek(summary: MonthlySummary, weekStart: Date): number {
  return monthSecondsForWeekFromCells(summary.calendarCells, weekStart)
}
