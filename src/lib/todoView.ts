import {
  daysInLocalWeek,
  startOfWeekMondayLocal,
  toYmdLocal,
  WEEKDAY_ZH,
} from './timeutil'
import type { TodoItem } from './todoStore'

export type TodoViewTab = 'today' | 'week' | 'month' | 'year'

export type TodoGroupId = 'in_progress' | 'pending' | 'completed'

export const TODO_GROUP_META: Record<TodoGroupId, { title: string }> = {
  in_progress: { title: '进行中' },
  pending: { title: '待处理' },
  completed: { title: '已完成' },
}

export const TODO_VIEW_TABS: { id: TodoViewTab; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'year', label: '年度' },
]

export function formatTodoHeaderDate(anchor = new Date()): string {
  const y = anchor.getFullYear()
  const m = anchor.getMonth() + 1
  const d = anchor.getDate()
  const wd = WEEKDAY_ZH[anchor.getDay()]
  return `${y}年${m}月${d}日，${wd}`
}

export function isTodoInViewTab(
  item: Pick<TodoItem, 'scheduledDate'>,
  tab: TodoViewTab,
  anchor = new Date(),
): boolean {
  const ymd = item.scheduledDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false

  switch (tab) {
    case 'today':
      return ymd === toYmdLocal(anchor)
    case 'week': {
      const start = toYmdLocal(startOfWeekMondayLocal(anchor))
      const end = toYmdLocal(daysInLocalWeek(startOfWeekMondayLocal(anchor))[6])
      return ymd >= start && ymd <= end
    }
    case 'month': {
      const prefix = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`
      return ymd.startsWith(prefix)
    }
    case 'year':
      return ymd.startsWith(`${anchor.getFullYear()}-`)
  }
}

/** 未完成任务的展示分组 */
export function classifyTodoGroup(item: TodoItem, nowMs: number): TodoGroupId {
  if (item.completedAt) return 'completed'

  const todayYmd = toYmdLocal(new Date(nowMs))
  const deadlineMs = item.deadlineAt ? Date.parse(item.deadlineAt) : NaN

  if (!Number.isNaN(deadlineMs)) {
    if (deadlineMs < nowMs) return 'in_progress'
    const deadlineYmd = toYmdLocal(new Date(deadlineMs))
    if (deadlineYmd === todayYmd) return 'in_progress'
  }

  if (item.priority >= 4) return 'in_progress'

  return 'pending'
}

export function filterTodosForTab(items: TodoItem[], tab: TodoViewTab, anchor = new Date()): TodoItem[] {
  return items.filter((t) => isTodoInViewTab(t, tab, anchor))
}

export function groupTodosByStatus(
  items: TodoItem[],
  tab: TodoViewTab,
  nowMs: number,
  anchor = new Date(),
): Record<TodoGroupId, TodoItem[]> {
  const visible = filterTodosForTab(items, tab, anchor)
  const groups: Record<TodoGroupId, TodoItem[]> = {
    in_progress: [],
    pending: [],
    completed: [],
  }

  for (const item of visible) {
    groups[classifyTodoGroup(item, nowMs)].push(item)
  }

  const sortOpen = (a: TodoItem, b: TodoItem) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    const ad = a.deadlineAt ? Date.parse(a.deadlineAt) : Number.POSITIVE_INFINITY
    const bd = b.deadlineAt ? Date.parse(b.deadlineAt) : Number.POSITIVE_INFINITY
    return ad - bd
  }

  groups.in_progress.sort(sortOpen)
  groups.pending.sort(sortOpen)
  groups.completed.sort(
    (a, b) =>
      Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt),
  )

  return groups
}

export type TodoViewStats = {
  total: number
  completed: number
  inProgress: number
  pending: number
  completionRate: number
  deltaVsYesterday: number | null
  overdueCount: number
}

export function computeTodoViewStats(
  items: TodoItem[],
  tab: TodoViewTab,
  nowMs: number,
  anchor = new Date(),
): TodoViewStats {
  const visible = filterTodosForTab(items, tab, anchor)
  const groups = groupTodosByStatus(items, tab, nowMs, anchor)
  const total = visible.length
  const completed = groups.completed.length
  const inProgress = groups.in_progress.length
  const pending = groups.pending.length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  let deltaVsYesterday: number | null = null
  if (tab === 'today') {
    const todayYmd = toYmdLocal(anchor)
    const y = new Date(anchor)
    y.setDate(y.getDate() - 1)
    const yesterdayYmd = toYmdLocal(y)
    const todayAll = items.filter((t) => t.scheduledDate === todayYmd).length
    const yesterdayAll = items.filter((t) => t.scheduledDate === yesterdayYmd).length
    deltaVsYesterday = todayAll - yesterdayAll
  }

  const overdueCount = groups.in_progress.filter((t) => {
    if (!t.deadlineAt) return false
    return Date.parse(t.deadlineAt) < nowMs
  }).length

  return {
    total,
    completed,
    inProgress,
    pending,
    completionRate,
    deltaVsYesterday,
    overdueCount,
  }
}

const DAY_MS = 86_400_000

/** 列表时间展示：今日 18:00 / 明日截止 / 上午完成 */
export function formatTodoTimeLabel(
  item: TodoItem,
  nowMs: number,
): { text: string; completed: boolean } {
  if (item.completedAt) {
    const d = new Date(item.completedAt)
    const h = d.getHours()
    const period = h < 12 ? '上午' : h < 18 ? '下午' : '晚上'
    return { text: `${period}完成`, completed: true }
  }

  if (!item.deadlineAt) return { text: '无截止时间', completed: false }

  const end = Date.parse(item.deadlineAt)
  if (Number.isNaN(end)) return { text: '无截止时间', completed: false }

  const todayYmd = toYmdLocal(new Date(nowMs))
  const deadlineYmd = toYmdLocal(new Date(end))
  const time = new Date(end).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  if (end < nowMs) return { text: '已逾期', completed: false }

  if (deadlineYmd === todayYmd) return { text: `今日 ${time}`, completed: false }

  const tomorrow = new Date(nowMs + DAY_MS)
  if (deadlineYmd === toYmdLocal(tomorrow)) return { text: '明日截止', completed: false }

  return {
    text: new Date(end).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    completed: false,
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 卡片右下角时间：今日仅时分秒；跨日视图非今日任务前缀月日与星期 */
export function formatTodoCardCornerTime(
  ms: number,
  tab: TodoViewTab,
  nowMs: number,
): string {
  const d = new Date(ms)
  const timePart = `${d.getHours()}时${pad2(d.getMinutes())}分${pad2(d.getSeconds())}秒`
  const todayYmd = toYmdLocal(new Date(nowMs))
  const tsYmd = toYmdLocal(d)

  if (tab === 'today' || tsYmd === todayYmd) return timePart

  const month = d.getMonth() + 1
  const day = d.getDate()
  const wd = WEEKDAY_ZH[d.getDay()]
  return `${month}月${day}日（${wd}）${timePart}`
}
