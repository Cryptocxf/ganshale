import { toYmdLocal } from './timeutil'

const AUTO_REPORT_FIRED_PREFIX = 'ganshale-daily-report-auto-18:'

function firedKey(day: Date): string {
  return `${AUTO_REPORT_FIRED_PREFIX}${toYmdLocal(day)}`
}

export function shouldFireAutoDailyReportAt18(
  day: Date,
  now: Date,
  lastFiredKey: string | null,
): { fire: boolean; nextKey: string | null } {
  const ymd = toYmdLocal(day)
  if (!isSameLocalDay(now, day)) {
    return { fire: false, nextKey: lastFiredKey }
  }
  const key = `${ymd}@18:00`
  if (lastFiredKey === key) return { fire: false, nextKey: lastFiredKey }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const targetMin = 18 * 60
  if (nowMin >= targetMin && nowMin < targetMin + 2) {
    return { fire: true, nextKey: key }
  }
  return { fire: false, nextKey: lastFiredKey }
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function loadAutoDailyReportFiredKey(day: Date): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(firedKey(day))
  } catch {
    return null
  }
}

export function saveAutoDailyReportFiredKey(day: Date, key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(firedKey(day), key)
  } catch {
    /* quota */
  }
}
