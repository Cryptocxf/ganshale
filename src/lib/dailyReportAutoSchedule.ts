import { formatClockHm, loadReportScheduleSettings } from './reportScheduleSettings'
import { toYmdLocal } from './timeutil'

const AUTO_REPORT_FIRED_PREFIX = 'ganshale-daily-report-auto:'

function firedStorageKey(day: Date): string {
  return `${AUTO_REPORT_FIRED_PREFIX}${toYmdLocal(day)}`
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function parseFiredSlots(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { fired?: unknown }
    if (Array.isArray(parsed.fired)) {
      return parsed.fired.filter((x): x is string => typeof x === 'string')
    }
  } catch {
    /* legacy single key */
  }
  if (raw.includes('@')) return [raw]
  return []
}

function slotKey(ymd: string, hour: number, minute: number): string {
  return `${ymd}@${formatClockHm(hour, minute)}`
}

function shouldFireAtMinute(
  day: Date,
  now: Date,
  lastFiredSlots: string[],
  hour: number,
  minute: number,
  windowMinutes = 2,
): { fire: boolean; nextSlots: string[] } {
  const ymd = toYmdLocal(day)
  if (!isSameLocalDay(now, day)) {
    return { fire: false, nextSlots: lastFiredSlots }
  }
  const key = slotKey(ymd, hour, minute)
  if (lastFiredSlots.includes(key)) {
    return { fire: false, nextSlots: lastFiredSlots }
  }
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const targetMin = hour * 60 + minute
  if (nowMin >= targetMin && nowMin < targetMin + windowMinutes) {
    return { fire: true, nextSlots: [...lastFiredSlots, key] }
  }
  return { fire: false, nextSlots: lastFiredSlots }
}

/** 按设置中的时间自动触发生成日报 */
export function shouldFireAutoDailyReport(
  day: Date,
  now: Date,
  lastFiredSlots: string[] | null,
): { fire: boolean; nextSlots: string[] } {
  const settings = loadReportScheduleSettings()
  if (!settings.dailyReportAutoEnabled) {
    return { fire: false, nextSlots: lastFiredSlots ?? [] }
  }
  return shouldFireAtMinute(
    day,
    now,
    lastFiredSlots ?? [],
    settings.dailyReportHour,
    settings.dailyReportMinute,
  )
}

/** @deprecated 使用 shouldFireAutoDailyReport */
export function shouldFireAutoDailyReportAt18(
  day: Date,
  now: Date,
  lastFiredSlots: string[] | null,
): { fire: boolean; nextSlots: string[] } {
  return shouldFireAutoDailyReport(day, now, lastFiredSlots)
}

export function loadAutoDailyReportFiredSlots(day: Date): string[] {
  if (typeof window === 'undefined') return []
  const ymd = toYmdLocal(day)
  const slots: string[] = []
  try {
    slots.push(...parseFiredSlots(localStorage.getItem(firedStorageKey(day))))
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(`ganshale-daily-report-auto-18:${ymd}`)
    if (legacy && !slots.includes(legacy)) slots.push(legacy)
  } catch {
    /* ignore */
  }
  return slots
}

/** @deprecated 使用 loadAutoDailyReportFiredSlots */
export function loadAutoDailyReportFiredKey(day: Date): string | null {
  const slots = loadAutoDailyReportFiredSlots(day)
  return slots.length > 0 ? slots[slots.length - 1]! : null
}

export function saveAutoDailyReportFiredSlots(day: Date, slots: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(firedStorageKey(day), JSON.stringify({ fired: slots }))
  } catch {
    /* quota */
  }
}

/** @deprecated 使用 saveAutoDailyReportFiredSlots */
export function saveAutoDailyReportFiredKey(day: Date, key: string): void {
  const prev = loadAutoDailyReportFiredSlots(day)
  if (!prev.includes(key)) {
    saveAutoDailyReportFiredSlots(day, [...prev, key])
  }
}
