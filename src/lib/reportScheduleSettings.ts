export type ReportScheduleSettings = {
  /** 是否开启自动生成日报 */
  dailyReportAutoEnabled: boolean
  /** 自动生成日报：时（0–23） */
  dailyReportHour: number
  /** 自动生成日报：分（0–59） */
  dailyReportMinute: number
  /** 是否开启自动生成周报 */
  weeklyReportAutoEnabled: boolean
  /** 自动生成周报：星期（Date.getDay()，0=周日 … 6=周六） */
  weeklyReportWeekday: number
  weeklyReportHour: number
  weeklyReportMinute: number
  /** 是否开启自动生成月报 */
  monthlyReportAutoEnabled: boolean
  /** 自动生成月报：每月几号（1–31，超出当月天数时取当月最后一天） */
  monthlyReportDayOfMonth: number
  monthlyReportHour: number
  monthlyReportMinute: number
}

export const REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT = 'ganshale-report-schedule-settings-changed'

const STORAGE_KEY = 'ganshale-report-schedule-settings-v1'

export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

export const HOUR_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: 24 },
  (_, hour) => ({ value: hour, label: `${hour} 点` }),
)

export const MONTH_DAY_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: 31 },
  (_, i) => ({ value: i + 1, label: `${i + 1} 日` }),
)

function clampHour(v: number): number {
  return Math.max(0, Math.min(23, Math.floor(v)))
}

function clampWeekday(v: number): number {
  if (!Number.isFinite(v)) return 5
  const n = Math.floor(v)
  return n >= 0 && n <= 6 ? n : 5
}

function clampDayOfMonth(v: number, fallback = lastDayOfLocalMonth()): number {
  if (!Number.isFinite(v)) return fallback
  const n = Math.floor(v)
  return n >= 1 && n <= 31 ? n : fallback
}

/** 指定月份（或当前月）的最后一天是几号 */
export function lastDayOfLocalMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** 将配置的「几号」映射到指定月份的有效日期（31 号在 2 月 → 28/29 日） */
export function effectiveMonthDay(dayOfMonth: number, monthAnchor: Date): number {
  const year = monthAnchor.getFullYear()
  const month = monthAnchor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Math.min(clampDayOfMonth(dayOfMonth), daysInMonth)
}

export function defaultReportScheduleSettings(now = new Date()): ReportScheduleSettings {
  return {
    dailyReportAutoEnabled: true,
    dailyReportHour: 18,
    dailyReportMinute: 0,
    weeklyReportAutoEnabled: true,
    weeklyReportWeekday: 5,
    weeklyReportHour: 17,
    weeklyReportMinute: 0,
    monthlyReportAutoEnabled: true,
    monthlyReportDayOfMonth: lastDayOfLocalMonth(now),
    monthlyReportHour: 17,
    monthlyReportMinute: 0,
  }
}

function normalizeBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function normalize(raw: Partial<ReportScheduleSettings>): ReportScheduleSettings {
  const d = defaultReportScheduleSettings()
  return {
    dailyReportAutoEnabled: normalizeBool(raw.dailyReportAutoEnabled, d.dailyReportAutoEnabled),
    dailyReportHour: clampHour(raw.dailyReportHour ?? d.dailyReportHour),
    dailyReportMinute: 0,
    weeklyReportAutoEnabled: normalizeBool(raw.weeklyReportAutoEnabled, d.weeklyReportAutoEnabled),
    weeklyReportWeekday: clampWeekday(raw.weeklyReportWeekday ?? d.weeklyReportWeekday),
    weeklyReportHour: clampHour(raw.weeklyReportHour ?? d.weeklyReportHour),
    weeklyReportMinute: 0,
    monthlyReportAutoEnabled: normalizeBool(raw.monthlyReportAutoEnabled, d.monthlyReportAutoEnabled),
    monthlyReportDayOfMonth: clampDayOfMonth(
      raw.monthlyReportDayOfMonth ??
        (raw as { monthlyReportWeekday?: number }).monthlyReportWeekday ??
        d.monthlyReportDayOfMonth,
    ),
    monthlyReportHour: clampHour(raw.monthlyReportHour ?? d.monthlyReportHour),
    monthlyReportMinute: 0,
  }
}

export function loadReportScheduleSettings(): ReportScheduleSettings {
  if (typeof window === 'undefined') return defaultReportScheduleSettings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultReportScheduleSettings()
    return normalize(JSON.parse(raw) as Partial<ReportScheduleSettings>)
  } catch {
    return defaultReportScheduleSettings()
  }
}

export function saveReportScheduleSettings(next: ReportScheduleSettings): void {
  if (typeof window === 'undefined') return
  const normalized = normalize(next)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new Event(REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT))
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatClockHm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_OPTIONS.find((o) => o.value === weekday)?.label ?? '—'
}

export function formatHourLabel(hour: number): string {
  return `${clampHour(hour)} 点`
}

export function monthDayLabel(dayOfMonth: number): string {
  return `${clampDayOfMonth(dayOfMonth)} 日`
}

export function formatDailyAutoTriggerLabel(settings = loadReportScheduleSettings()): string | null {
  if (!settings.dailyReportAutoEnabled) return null
  return `每天 ${formatHourLabel(settings.dailyReportHour)} 自动触发`
}

export function formatWeeklyAutoTriggerLabel(settings = loadReportScheduleSettings()): string | null {
  if (!settings.weeklyReportAutoEnabled) return null
  return `每${weekdayLabel(settings.weeklyReportWeekday)} ${formatHourLabel(settings.weeklyReportHour)} 自动触发`
}

export function formatMonthlyAutoTriggerLabel(settings = loadReportScheduleSettings()): string | null {
  if (!settings.monthlyReportAutoEnabled) return null
  return `每月 ${monthDayLabel(settings.monthlyReportDayOfMonth)} ${formatHourLabel(settings.monthlyReportHour)} 自动触发`
}
