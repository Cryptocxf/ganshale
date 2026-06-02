import { fromDatetimeLocalValue } from './todoCountdown'

export type DeadlinePresetId = 'none' | 'today18' | 'tomorrow9' | 'in3days' | 'custom'
export type ReminderPresetId = 'none' | 'before15m' | 'before1h' | 'today17' | 'custom'

export const DEADLINE_PRESET_OPTIONS: { id: DeadlinePresetId; label: string }[] = [
  { id: 'none', label: '不设置' },
  { id: 'today18', label: '今天 18:00' },
  { id: 'tomorrow9', label: '明天 09:00' },
  { id: 'in3days', label: '三天后 18:00' },
  { id: 'custom', label: '自定义…' },
]

export const REMINDER_PRESET_OPTIONS: { id: ReminderPresetId; label: string }[] = [
  { id: 'none', label: '不提醒' },
  { id: 'before15m', label: '截止前 15 分钟' },
  { id: 'before1h', label: '截止前 1 小时' },
  { id: 'today17', label: '今天 17:00' },
  { id: 'custom', label: '自定义…' },
]

function atLocalTime(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function deadlineIsoFromPreset(id: DeadlinePresetId, customLocal: string): string | null {
  if (id === 'none') return null
  if (id === 'custom') return fromDatetimeLocalValue(customLocal)
  const now = new Date()
  if (id === 'today18') return atLocalTime(now, 18).toISOString()
  if (id === 'tomorrow9') {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return atLocalTime(d, 9).toISOString()
  }
  if (id === 'in3days') {
    const d = new Date(now)
    d.setDate(d.getDate() + 3)
    return atLocalTime(d, 18).toISOString()
  }
  return null
}

export function reminderIsoFromPreset(
  id: ReminderPresetId,
  customLocal: string,
  deadlineIso: string | null,
): string | null {
  if (id === 'none') return null
  if (id === 'custom') return fromDatetimeLocalValue(customLocal)
  const now = new Date()
  if (id === 'today17') return atLocalTime(now, 17).toISOString()
  if (deadlineIso) {
    const end = Date.parse(deadlineIso)
    if (!Number.isNaN(end)) {
      if (id === 'before15m') return new Date(end - 15 * 60_000).toISOString()
      if (id === 'before1h') return new Date(end - 60 * 60_000).toISOString()
    }
  }
  return null
}
