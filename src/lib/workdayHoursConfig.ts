export const WORKDAY_HALF_HOUR_STEP_MIN = 30

export type WorkdayHoursSettings = {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export const DEFAULT_WORKDAY_HOURS: WorkdayHoursSettings = {
  startHour: 9,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
}

export const WORKDAY_HOURS_SETTINGS_CHANGED_EVENT = 'ganshale-workday-hours-settings-changed'

const STORAGE_KEY = 'ganshale-workday-hours-settings-v1'

function clampHour(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(23, Math.max(0, Math.round(v)))
}

function clampMinute(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(59, Math.max(0, Math.round(v)))
}

/** 对齐到最近的半小时档（0 或 30 分） */
export function snapToHalfHourSlot(hour: number, minute: number): { hour: number; minute: number } {
  let totalMin = clampHour(hour, 0) * 60 + clampMinute(minute, 0)
  totalMin = Math.round(totalMin / WORKDAY_HALF_HOUR_STEP_MIN) * WORKDAY_HALF_HOUR_STEP_MIN
  totalMin = Math.min(23 * 60 + 30, Math.max(0, totalMin))
  return { hour: Math.floor(totalMin / 60), minute: totalMin % 60 }
}

export function halfHourSlotKey(hour: number, minute: number): string {
  const snapped = snapToHalfHourSlot(hour, minute)
  return `${snapped.hour}:${String(snapped.minute).padStart(2, '0')}`
}

export function parseHalfHourSlotKey(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23) return null
  if (minute !== 0 && minute !== 30) return null
  return { hour, minute }
}

export function halfHourTimeOptions(): { key: string; hour: number; minute: number; label: string }[] {
  const out: { key: string; hour: number; minute: number; label: string }[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      out.push({
        key: `${hour}:${String(minute).padStart(2, '0')}`,
        hour,
        minute,
        label: formatWorkdayClock(hour, minute),
      })
    }
  }
  return out
}

export function normalizeWorkdayHoursSettings(
  raw: Partial<WorkdayHoursSettings> | null | undefined,
): WorkdayHoursSettings {
  const d = DEFAULT_WORKDAY_HOURS
  const start = snapToHalfHourSlot(
    clampHour(raw?.startHour, d.startHour),
    clampMinute(raw?.startMinute, d.startMinute),
  )
  const end = snapToHalfHourSlot(
    clampHour(raw?.endHour, d.endHour),
    clampMinute(raw?.endMinute, d.endMinute),
  )
  return {
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
  }
}

export function workdayStartMin(settings: WorkdayHoursSettings): number {
  return settings.startHour * 60 + settings.startMinute
}

export function workdayEndMin(settings: WorkdayHoursSettings): number {
  return settings.endHour * 60 + settings.endMinute
}

export function formatWorkdayClock(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, '0')}`
}

export function toTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseTimeInputValue(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function loadWorkdayHoursSettings(): WorkdayHoursSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_WORKDAY_HOURS }
    return normalizeWorkdayHoursSettings(JSON.parse(raw) as Partial<WorkdayHoursSettings>)
  } catch {
    return { ...DEFAULT_WORKDAY_HOURS }
  }
}

export function saveWorkdayHoursSettings(settings: WorkdayHoursSettings): void {
  const normalized = normalizeWorkdayHoursSettings(settings)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(WORKDAY_HOURS_SETTINGS_CHANGED_EVENT, { detail: normalized }))
}
