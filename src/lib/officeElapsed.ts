import type { AwEvent } from './awTypes'
import type { LiveForegroundSample } from './liveForeground'
import { sumMonitoredWindowSecondsForDayLive } from './monitoredWorktime'
import { officeSecondsAfterPause } from './workdayTimerPause'
import { compareLocalCalendarDay, daysInLocalWeek, isSameLocalCalendarDay } from './timeutil'
import { windowEventsForLocalDay } from './weeklyWorktime'

/** 每日 / 每周 / 每月共用的办公时长计算上下文 */
export type OfficeElapsedContext = {
  patterns: string[]
  live?: LiveForegroundSample | null
  nowMs: number
  /** 所选为今天且为当前月/周视图时，是否 live 外推 */
  extrapolateLive?: boolean
  /** 今日累计暂停毫秒（仅今日生效） */
  pausedMsToday?: number
}

function pausedMsForDay(day: Date, ctx: OfficeElapsedContext): number {
  if (!ctx.extrapolateLive) return 0
  return isSameLocalCalendarDay(day, new Date(ctx.nowMs)) ? (ctx.pausedMsToday ?? 0) : 0
}

/** 单日办公时长（与每日页「今日办公总时长」同源） */
export function officeElapsedForDay(
  day: Date,
  events: AwEvent[],
  ctx: OfficeElapsedContext,
): number {
  const extrapolate = Boolean(ctx.extrapolateLive && isSameLocalCalendarDay(day, new Date(ctx.nowMs)))
  const raw = sumMonitoredWindowSecondsForDayLive(
    day,
    windowEventsForLocalDay(events, day),
    ctx.patterns,
    ctx.live ?? null,
    ctx.nowMs,
    extrapolate,
  )
  const pausedMs = pausedMsForDay(day, ctx)
  return pausedMs > 0 ? officeSecondsAfterPause(raw, pausedMs) : raw
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
