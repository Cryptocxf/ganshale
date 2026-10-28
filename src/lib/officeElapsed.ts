import type { AwEvent } from './awTypes'
import type { LiveForegroundSample } from './liveForeground'
import { sumMonitoredWindowSecondsForDayLive } from './monitoredWorktime'
import { compareLocalCalendarDay, daysInLocalWeek, isSameLocalCalendarDay } from './timeutil'
import { windowEventsForLocalDay } from './weeklyWorktime'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import { startOfLocalDay } from './timeutil'

/** 每日 / 每周 / 每月共用的办公时长计算上下文 */
export type OfficeElapsedContext = {
  patterns: string[]
  live?: LiveForegroundSample | null
  nowMs: number
  /** 所选为今天且为当前月/周视图时，是否 live 外推 */
  extrapolateLive?: boolean
}

/** 单日办公时长（与每日页「今日办公总时长」同源） */
export function officeElapsedForDay(
  day: Date,
  events: AwEvent[],
  ctx: OfficeElapsedContext,
): number {
  const extrapolate = Boolean(ctx.extrapolateLive && isSameLocalCalendarDay(day, new Date(ctx.nowMs)))
  const selected = windowEventsForLocalDay(events, day)
  if (selected.some((event) => event.data.kind === 'work-session')) {
    const newestSessionId = selected.filter((event) => event.data.kind === 'work-session').sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]?.id
    const start = startOfLocalDay(day).getTime()
    const nextDay = new Date(start)
    nextDay.setDate(nextDay.getDate() + 1)
    const end = Math.min(nextDay.getTime(), ctx.nowMs)
    // 合并会话与旧版窗口区间：既不重复累计，也保留升级前已有的真实记录。
    const intervals = selected.flatMap((event) => {
      const session = event.data.kind === 'work-session'
      if (!session && shouldSkipWindowEventForStats(event)) return []
      const from = Math.max(start, Date.parse(event.timestamp))
      let to = Date.parse(event.timestamp) + Math.max(0, event.duration) * 1000
      const observedAt = Number(event.data.observedAt)
      if (session && event.id === newestSessionId && extrapolate && !event.data.closed && Number.isFinite(observedAt)) to = Math.max(to, Math.min(ctx.nowMs, observedAt + 5000))
      to = Math.min(to, end)
      return Number.isFinite(from) && to > from ? [[from, to]] : []
    }).sort((a, b) => a[0] - b[0])
    let milliseconds = 0
    let from = 0
    let to = 0
    for (const interval of intervals) {
      if (interval[0] > to) { milliseconds += to - from; [from, to] = interval }
      else to = Math.max(to, interval[1])
    }
    return Math.round((milliseconds + to - from) / 1000)
  }
  return sumMonitoredWindowSecondsForDayLive(
    day,
    selected,
    ctx.patterns,
    ctx.live ?? null,
    ctx.nowMs,
    extrapolate,
  )
}

function sumOfficeElapsedForDays(
  days: Iterable<Date>,
  events: AwEvent[],
  ctx: OfficeElapsedContext,
): number {
  const now = new Date(ctx.nowMs)
  let total = 0
  for (const day of days) {
    if (compareLocalCalendarDay(day, now) === 'future') continue
    total += officeElapsedForDay(day, events, ctx)
  }
  return total
}

/** 整周办公时长（周一至周日，与每周页「本周总工作时长」同源） */
export function sumOfficeElapsedForWeek(
  weekStartMonday: Date,
  events: AwEvent[],
  ctx: OfficeElapsedContext,
): number {
  return sumOfficeElapsedForDays(daysInLocalWeek(weekStartMonday), events, ctx)
}

/** 本月 1 号至参考日（含）办公时长；参考日由 ctx.nowMs 决定 */
export function sumOfficeElapsedForMonthThrough(
  daysInMonth: Iterable<Date>,
  events: AwEvent[],
  ctx: OfficeElapsedContext,
): number {
  return sumOfficeElapsedForDays(daysInMonth, events, ctx)
}

/** 周块内、且落在当月范围内的办公时长 */
export function sumOfficeElapsedForMonthWeekBlock(
  monthFirst: Date,
  monthLast: Date,
  weekStartMonday: Date,
  events: AwEvent[],
  ctx: OfficeElapsedContext,
): number {
  let total = 0
  for (const day of daysInLocalWeek(weekStartMonday)) {
    if (day < monthFirst || day > monthLast) continue
    if (compareLocalCalendarDay(day, new Date(ctx.nowMs)) === 'future') continue
    total += officeElapsedForDay(day, events, ctx)
  }
  return total
}
