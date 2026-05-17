export function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function parseIso(s: string): number {
  return new Date(s).getTime()
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** 对话气泡旁时间（ISO → 本地 `HH:mm`） */
export function formatChatMessageStamp(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return formatClock(new Date(t))
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** `YYYY-MM-DD` 本地日历日（用于 `<input type="date">`） */
const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** 本地 `YYYY年MM月DD日 HH:mm:ss` */
export function formatDatetimeZh(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}年${mo}月${day}日 ${h}:${mi}:${s}`
}

/** 本地 `YYYY年MM月DD日（周X）HH:mm:ss` */
export function formatDatetimeZhWithWeekday(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const w = WEEKDAY_ZH[d.getDay()]
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}年${mo}月${day}日（${w}）${h}:${mi}:${s}`
}

export function toYmdLocal(d: Date): string {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return toYmdLocal(a) === toYmdLocal(b)
}

/** 相对参考日的本地日历：过去 / 当天 / 未来 */
export function compareLocalCalendarDay(
  selected: Date,
  reference: Date = new Date(),
): 'past' | 'today' | 'future' {
  const a = toYmdLocal(selected)
  const b = toYmdLocal(reference)
  if (a < b) return 'past'
  if (a > b) return 'future'
  return 'today'
}

/** 周一 00:00 本地 */
export function startOfWeekMondayLocal(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfWeekSundayLocal(weekStartMonday: Date): Date {
  const x = new Date(weekStartMonday)
  x.setDate(x.getDate() + 6)
  x.setHours(23, 59, 59, 999)
  return x
}

export function startOfMonthLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  return x
}

export function endOfMonthLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return x
}

export function startOfYearLocal(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function endOfYearLocal(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}
