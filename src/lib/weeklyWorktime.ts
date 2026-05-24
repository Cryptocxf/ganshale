import type { AwEvent } from './awTypes'
import { formatDurationHmsZh } from './aggregations'
import { loadDailyReportHistory } from './dailyReportHistoryStore'
import { sumMonitoredWindowSecondsForDayLive } from './monitoredWorktime'
import type { LiveForegroundSample } from './liveForeground'
import { excludeGanshaleSelfWindowEvents } from './selfWindowFilter'
import {
  compareLocalCalendarDay,
  daysInLocalWeek,
  endOfLocalDay,
  endOfWeekSundayLocal,
  isSameLocalCalendarDay,
  parseIso,
  startOfLocalDay,
  startOfWeekMondayLocal,
} from './timeutil'
import * as store from './idbStore'
import { BUCKET_WINDOW } from './seed'

export function addWeeksMondayLocal(weekStartMonday: Date, delta: number): Date {
  const x = new Date(weekStartMonday)
  x.setDate(x.getDate() + delta * 7)
  return startOfWeekMondayLocal(x)
}

/** ISO 8601 周序号（本地） */
export function isoWeekNumberLocal(d: Date): number {
  const date = new Date(d)
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4, 12, 0, 0, 0)
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  )
}

export function windowEventsForLocalDay(all: AwEvent[], day: Date): AwEvent[] {
  const t0 = startOfLocalDay(day).getTime()
  const t1 = endOfLocalDay(day).getTime()
  return all.filter((ev) => {
    const t = parseIso(ev.timestamp)
    return t >= t0 && t <= t1
  })
}

export async function loadWindowEventsForWeekRange(
  weekStartMonday: Date,
  weekSpan = 1,
): Promise<AwEvent[]> {
  const start = startOfLocalDay(weekStartMonday).toISOString()
  const endMonday = addWeeksMondayLocal(weekStartMonday, weekSpan - 1)
  const end = endOfLocalDay(endOfWeekSundayLocal(endMonday)).toISOString()
  const rows = await store.getEventsInRange(BUCKET_WINDOW, start, end)
  return excludeGanshaleSelfWindowEvents(rows)
}

export type SumWeekOfficeOptions = {
  weekStartMonday: Date
  events: AwEvent[]
  patterns: string[]
  live: LiveForegroundSample | null
  now?: Date
  /** 今日是否按采集中规则累计（仅本周有效） */
  extrapolateToday?: boolean
}

export function sumOfficeSecondsForWeek({
  weekStartMonday,
  events,
  patterns,
  live,
  now = new Date(),
  extrapolateToday = false,
}: SumWeekOfficeOptions): number {
  let pastSec = 0
  let todaySec = 0
  for (const day of daysInLocalWeek(weekStartMonday)) {
    const dayKind = compareLocalCalendarDay(day, now)
    if (dayKind === 'future') continue
    const dayEvents = windowEventsForLocalDay(events, day)
    const isToday = isSameLocalCalendarDay(day, now)
    const sec = sumMonitoredWindowSecondsForDayLive(
      day,
      dayEvents,
      patterns,
      live,
      now.getTime(),
      isToday && extrapolateToday,
    )
    if (isToday) todaySec = sec
    else pastSec += sec
  }
  return pastSec + todaySec
}

/** 当日办公时长（与每日页、周柱状图共用） */
export function officeSecondsForLocalDay(
  day: Date,
  events: AwEvent[],
  patterns: string[],
  live: LiveForegroundSample | null,
  now: Date,
  extrapolateToday: boolean,
): number {
  const dayEvents = windowEventsForLocalDay(events, day)
  return sumMonitoredWindowSecondsForDayLive(
    day,
    dayEvents,
    patterns,
    live,
    now.getTime(),
    isSameLocalCalendarDay(day, now) && extrapolateToday,
  )
}

/** 当周内有日报记录的日历日（周一至周日；默认不含未来日） */
export function daysWithDailyReportInWeek(
  weekStartMonday: Date,
  options?: { includeFuture?: boolean },
): Date[] {
  return daysInLocalWeek(weekStartMonday).filter((day) => {
    if (!options?.includeFuture && compareLocalCalendarDay(day) === 'future') return false
    return loadDailyReportHistory(day).length > 0
  })
}

export function dayHasDailyReport(day: Date): boolean {
  return loadDailyReportHistory(day).length > 0
}

/** 工作天数：当周有日报的天数（0—7） */
export function countReportWorkDaysInWeek(weekStartMonday: Date): number {
  return daysWithDailyReportInWeek(weekStartMonday).length
}

/** 当周总工作时长：仅累计有日报的日期（与 officeSecondsForLocalDay 一致） */
export function sumOfficeSecondsForReportWorkDays({
  weekStartMonday,
  events,
  patterns,
  live,
  now = new Date(),
  extrapolateToday = false,
}: SumWeekOfficeOptions): number {
  let total = 0
  for (const day of daysWithDailyReportInWeek(weekStartMonday)) {
    total += officeSecondsForLocalDay(
      day,
      events,
      patterns,
      live,
      now,
      extrapolateToday,
    )
  }
  return total
}

/** 顶栏周选择：`第21周 5/18 - 5/24`（周一至周日） */
export function formatWeekPickerLabel(weekStartMonday: Date, weekNo?: number): string {
  const days = daysInLocalWeek(weekStartMonday)
  const mon = days[0]!
  const sun = days[6]!
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  const no = weekNo ?? isoWeekNumberLocal(weekStartMonday)
  return `第${no}周 ${fmt(mon)} - ${fmt(sun)}`
}

/** 环比对比时，上一周累计完整 7 天（周一至周日） */
export function referenceForPrevWeekComparison(weekStartMonday: Date): Date {
  return endOfWeekSundayLocal(addWeeksMondayLocal(weekStartMonday, -1))
}

export function sumOfficeSecondsForPrevWeekCompare(
  options: Omit<SumWeekOfficeOptions, 'now' | 'extrapolateToday' | 'live'>,
): number {
  return sumOfficeSecondsForWeek({
    ...options,
    weekStartMonday: addWeeksMondayLocal(options.weekStartMonday, -1),
    live: null,
    now: referenceForPrevWeekComparison(options.weekStartMonday),
    extrapolateToday: false,
  })
}

/** 本周已过的日历天数（周一至参考日，含参考日） */
export function elapsedWeekdaysInclusive(weekStartMonday: Date, reference = new Date()): number {
  const days = daysInLocalWeek(weekStartMonday)
  const refYmd = startOfLocalDay(reference).getTime()
  let n = 0
  for (const d of days) {
    if (startOfLocalDay(d).getTime() <= refYmd) n += 1
    else break
  }
  return Math.max(1, Math.min(7, n))
}

export function splitHoursMinutes(totalSec: number): { h: number; m: number } {
  const s0 = Math.max(0, Math.round(totalSec))
  return {
    h: Math.floor(s0 / 3600),
    m: Math.floor((s0 % 3600) / 60),
  }
}

/** `02小时29分钟`（时分均两位，用于文案/无障碍） */
export function formatHoursMinutesZh(totalSec: number): string {
  const { h, m } = splitHoursMinutes(totalSec)
  return `${String(h).padStart(2, '0')}小时${String(m).padStart(2, '0')}分钟`
}

export function formatSignedHoursMinutesZh(deltaSec: number): string {
  const sign = deltaSec > 0 ? '+' : deltaSec < 0 ? '-' : ''
  return `${sign}${formatHoursMinutesZh(Math.abs(deltaSec))}`
}

/** 环比：`+5小时12分钟` */
export function formatSignedHmShort(deltaSec: number): string {
  const sign = deltaSec > 0 ? '+' : deltaSec < 0 ? '-' : ''
  return `${sign}${formatHoursMinutesZh(Math.abs(deltaSec))}`
}

/** 柱顶/环比等：≤1 小时为「x分x秒」，>1 小时为「x小时x分钟」 */
export function formatBarDurationZh(totalSec: number): string {
  const s0 = Math.max(0, Math.round(totalSec))
  if (s0 <= 3600) {
    const m = Math.floor(s0 / 60)
    const sec = s0 % 60
    return `${m}分${sec}秒`
  }
  const h = Math.floor(s0 / 3600)
  const m = Math.floor((s0 % 3600) / 60)
  return `${h}小时${m}分钟`
}

/** 环比增量绝对值：`N小时N分钟N秒` */
export function formatCompareDeltaAbsZh(deltaSec: number): string {
  return formatDurationHmsZh(Math.abs(deltaSec))
}

/** @deprecated 使用 formatHoursMinutesZh */
export function formatHmShortDisplay(totalSec: number): string {
  return formatHoursMinutesZh(totalSec)
}

export function countWorkDaysInWeek({
  weekStartMonday,
  events,
  patterns,
  live,
  now = new Date(),
  extrapolateToday = false,
}: SumWeekOfficeOptions): number {
  let n = 0
  for (const day of daysInLocalWeek(weekStartMonday)) {
    if (compareLocalCalendarDay(day, now) === 'future') continue
    const dayEvents = windowEventsForLocalDay(events, day)
    const sec = sumMonitoredWindowSecondsForDayLive(
      day,
      dayEvents,
      patterns,
      live,
      now.getTime(),
      isSameLocalCalendarDay(day, now) && extrapolateToday,
    )
    if (sec > 0) n += 1
  }
  return n
}

export type WeekCompareTone = 'up' | 'down' | 'flat' | 'none'

export function formatWeekOverWeekCompare(
  currentSec: number,
  prevSec: number,
): { line: string; tone: WeekCompareTone } {
  if (prevSec <= 0 && currentSec <= 0) {
    return { line: '较上周暂无对比数据', tone: 'none' }
  }
  const delta = currentSec - prevSec
  const absLabel = formatCompareDeltaAbsZh(delta)
  const pct = prevSec > 0 ? Math.round((delta / prevSec) * 100) : null
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
    return { line: `较上周 ${absLabel}${suffix}`, tone: 'flat' }
  }
  const sign = delta > 0 ? '+' : '-'
  const suffix = pctLabel != null ? ` (${pctLabel})` : ''
  return {
    line: `较上周 ${sign}${absLabel}${suffix}`,
    tone: delta > 0 ? 'up' : 'down',
  }
}
