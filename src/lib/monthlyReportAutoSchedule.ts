import {
  effectiveMonthDay,
  formatClockHm,
  loadReportScheduleSettings,
} from './reportScheduleSettings'
import { startOfMonthLocal, toYmdLocal } from './timeutil'

const AUTO_MONTHLY_FIRED_PREFIX = 'ganshale-monthly-report-auto:'

function firedKey(monthAnchor: Date): string {
  return `${AUTO_MONTHLY_FIRED_PREFIX}${toYmdLocal(startOfMonthLocal(monthAnchor))}`
}

function scheduleSlotKey(
  monthAnchor: Date,
  dayOfMonth: number,
  hour: number,
  minute: number,
): string {
  return `${toYmdLocal(startOfMonthLocal(monthAnchor))}@${dayOfMonth}@${formatClockHm(hour, minute)}`
}

/** 按设置中的日期与时间，对「本月」自动触发一次 */
export function shouldFireAutoMonthlyReport(
  monthAnchor: Date,
  now: Date,
  lastFiredKey: string | null,
): { fire: boolean; nextKey: string | null } {
  const settings = loadReportScheduleSettings()
  if (!settings.monthlyReportAutoEnabled) {
    return { fire: false, nextKey: lastFiredKey }
  }
  const { monthlyReportDayOfMonth, monthlyReportHour, monthlyReportMinute } = settings

  const monthStart = startOfMonthLocal(monthAnchor)
  const currentMonthStart = startOfMonthLocal(now)
  if (toYmdLocal(monthStart) !== toYmdLocal(currentMonthStart)) {
    return { fire: false, nextKey: lastFiredKey }
  }

  const targetDay = effectiveMonthDay(monthlyReportDayOfMonth, monthStart)
  if (now.getDate() !== targetDay) {
    return { fire: false, nextKey: lastFiredKey }
  }

  const key = scheduleSlotKey(monthStart, targetDay, monthlyReportHour, monthlyReportMinute)
  if (lastFiredKey === key) return { fire: false, nextKey: lastFiredKey }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const targetMin = monthlyReportHour * 60 + monthlyReportMinute
  if (nowMin >= targetMin && nowMin < targetMin + 2) {
    return { fire: true, nextKey: key }
  }
  return { fire: false, nextKey: lastFiredKey }
}

export function loadAutoMonthlyReportFiredKey(monthAnchor: Date): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(firedKey(monthAnchor))
  } catch {
    return null
  }
}

export function saveAutoMonthlyReportFiredKey(monthAnchor: Date, key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(firedKey(monthAnchor), key)
  } catch {
    /* quota */
  }
}
