import type { TodoItem } from './todoStore'

export type TodoSortField = 'time' | 'priority'
export type TodoSortDirection = 'asc' | 'desc'

/** 已办条目按完成时间；待办按截止/归属日 */
export type TodoSortTimeSource = 'deadline' | 'completed'

export function todoSortTimeMs(
  item: TodoItem,
  timeSource: TodoSortTimeSource = 'deadline',
): number {
  if (timeSource === 'completed' && item.completedAt) {
    const t = Date.parse(item.completedAt)
    if (!Number.isNaN(t)) return t
  }
  if (item.deadlineAt) {
    const t = Date.parse(item.deadlineAt)
    if (!Number.isNaN(t)) return t
  }
  const d = Date.parse(`${item.scheduledDate}T23:59:59`)
  return Number.isNaN(d) ? 0 : d
}

export function sortTodoItems(
  items: readonly TodoItem[],
  field: TodoSortField,
  direction: TodoSortDirection,
  timeSource: TodoSortTimeSource = 'deadline',
): TodoItem[] {
  const dir = direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    if (field === 'priority') {
      if (a.priority !== b.priority) return (a.priority - b.priority) * dir
      return todoSortTimeMs(a, timeSource) - todoSortTimeMs(b, timeSource)
    }
    const ta = todoSortTimeMs(a, timeSource)
    const tb = todoSortTimeMs(b, timeSource)
    if (ta !== tb) return (ta - tb) * dir
    return b.priority - a.priority
  })
}

export function nextTodoSortState(
  field: TodoSortField,
  currentField: TodoSortField,
  currentDirection: TodoSortDirection,
): { field: TodoSortField; direction: TodoSortDirection } {
  if (currentField === field) {
    return { field, direction: currentDirection === 'asc' ? 'desc' : 'asc' }
  }
  return {
    field,
    direction: field === 'priority' ? 'desc' : 'asc',
  }
}
