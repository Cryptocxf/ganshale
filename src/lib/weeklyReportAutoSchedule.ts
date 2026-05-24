import { formatClockHm, loadReportScheduleSettings } from './reportScheduleSettings'
import { startOfWeekMondayLocal, toYmdLocal } from './timeutil'

const AUTO_WEEKLY_FIRED_PREFIX = 'ganshale-weekly-report-auto:'

function firedKey(weekStartMonday: Date): string {
  return `${AUTO_WEEKLY_FIRED_PREFIX}${toYmdLocal(startOfWeekMondayLocal(weekStartMonday))}`
}

function scheduleSlotKey(
  weekStartMonday: Date,
  weekday: number,
  hour: number,
  minute: number,
): string {
  return `${toYmdLocal(startOfWeekMondayLocal(weekStartMonday))}@${weekday}@${formatClockHm(hour, minute)}`
}

/** 按设置中的星期与时间，对「本周」自动触发一次 */
export function shouldFireAutoWeeklyReport(
  weekStartMonday: Date,
  now: Date,
  lastFiredKey: string | null,
): { fire: boolean; nextKey: string | null } {
  const settings = loadReportScheduleSettings()
  if (!settings.weeklyReportAutoEnabled) {
    return { fire: false, nextKey: lastFiredKey }
  }
  const { weeklyReportWeekday, weeklyReportHour, weeklyReportMinute } = settings

  const weekStart = startOfWeekMondayLocal(weekStartMonday)
  const currentWeekStart = startOfWeekMondayLocal(now)
  if (toYmdLocal(weekStart) !== toYmdLocal(currentWeekStart)) {
    return { fire: false, nextKey: lastFiredKey }
  }
  if (now.getDay() !== weeklyReportWeekday) {
    return { fire: false, nextKey: lastFiredKey }
  }

  const key = scheduleSlotKey(weekStart, weeklyReportWeekday, weeklyReportHour, weeklyReportMinute)
  if (lastFiredKey === key) return { fire: false, nextKey: lastFiredKey }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const targetMin = weeklyReportHour * 60 + weeklyReportMinute
  if (nowMin >= targetMin && nowMin < targetMin + 2) {
    return { fire: true, nextKey: key }
  }
  return { fire: false, nextKey: lastFiredKey }
}

/** @deprecated 使用 shouldFireAutoWeeklyReport */
export function shouldFireAutoWeeklyReportFriday17(
  weekStartMonday: Date,
  now: Date,
  lastFiredKey: string | null,
): { fire: boolean; nextKey: string | null } {
  return shouldFireAutoWeeklyReport(weekStartMonday, now, lastFiredKey)
}

export function loadAutoWeeklyReportFiredKey(weekStartMonday: Date): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(firedKey(weekStartMonday))
  } catch {
    return null
  }
}

export function saveAutoWeeklyReportFiredKey(weekStartMonday: Date, key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(firedKey(weekStartMonday), key)
  } catch {
    /* quota */
  }
}
