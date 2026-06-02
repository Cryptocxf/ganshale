export type TodoCountdownTone = 'muted' | 'soon' | 'urgent' | 'overdue' | 'done' | 'none'

export type TodoCountdownInfo = {
  label: string
  tone: TodoCountdownTone
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** `datetime-local` 控件值（本地时区） */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function formatDeadlineLabel(iso: string | null | undefined): string {
  if (!iso) return '无截止时间'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '无截止时间'
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatRemaining(ms: number): string {
  if (ms < MIN) return '不足 1 分钟'
  if (ms < HOUR) {
    const m = Math.ceil(ms / MIN)
    return `${m} 分钟`
  }
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR)
    const m = Math.ceil((ms % HOUR) / MIN)
    return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`
  }
  const days = Math.floor(ms / DAY)
  const h = Math.floor((ms % DAY) / HOUR)
  return h > 0 ? `${days} 天 ${h} 小时` : `${days} 天`
}

function formatOverdue(ms: number): string {
  return `已超时 ${formatRemaining(ms)}`
}

/** 截止倒计时 / 完成 / 超时文案 */
export function buildTodoCountdown(
  deadlineAt: string | null,
  completedAt: string | null,
  nowMs: number,
): TodoCountdownInfo {
  if (completedAt) {
    return { label: '已完成', tone: 'done' }
  }
  if (!deadlineAt) {
    return { label: '无倒计时', tone: 'none' }
  }
  const end = Date.parse(deadlineAt)
  if (Number.isNaN(end)) {
    return { label: '无倒计时', tone: 'none' }
  }
  const diff = end - nowMs
  if (diff <= 0) {
    return { label: formatOverdue(-diff), tone: 'overdue' }
  }
  if (diff <= HOUR) {
    return { label: `剩余 ${formatRemaining(diff)}`, tone: 'urgent' }
  }
  if (diff <= 24 * HOUR) {
    return { label: `剩余 ${formatRemaining(diff)}`, tone: 'soon' }
  }
  return { label: `剩余 ${formatRemaining(diff)}`, tone: 'muted' }
}

export function countdownBadgeClass(tone: TodoCountdownTone): string {
  switch (tone) {
    case 'done':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
    case 'overdue':
      return 'bg-rose-50 text-rose-700 ring-rose-200/80'
    case 'urgent':
      return 'bg-amber-50 text-amber-800 ring-amber-200/80'
    case 'soon':
      return 'bg-sky-50 text-sky-800 ring-sky-200/80'
    case 'none':
      return 'bg-ganshale-page text-ganshale-subtle ring-ganshale-border'
    default:
      return 'bg-ganshale-page text-ganshale-muted ring-ganshale-border'
  }
}
