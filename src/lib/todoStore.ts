import { normalizeTodoTags, type TodoTagId } from './todoTags'
import { toYmdLocal } from './timeutil'

export const TODO_MIN_PRIORITY = 1
export const TODO_MAX_PRIORITY = 10

export type TodoPriorityLevel =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10

export const TODO_PRIORITY_LEVELS: readonly TodoPriorityLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const

export type TodoItem = {
  id: string
  title: string
  /** 日历归属日 YYYY-MM-DD */
  scheduledDate: string
  /** 完成截止 ISO */
  deadlineAt: string | null
  /** 提醒时刻 ISO */
  reminderAt: string | null
  /** 已弹出提醒则写入，避免重复 */
  reminderFiredAt: string | null
  priority: TodoPriorityLevel
  tags: TodoTagId[]
  completedAt: string | null
  createdAt: string
}

const STORAGE_KEY = 'ganshale-todos-v2'
const LEGACY_KEY = 'ganshale-todos-v1'

export const TODOS_UPDATED_EVENT = 'ganshale-todos-updated'

function notify() {
  try {
    window.dispatchEvent(new CustomEvent(TODOS_UPDATED_EVENT))
  } catch {
    /* ignore */
  }
}

function clampPriority(n: number): TodoPriorityLevel {
  const v = Math.round(n)
  if (v <= TODO_MIN_PRIORITY) return TODO_MIN_PRIORITY
  if (v >= TODO_MAX_PRIORITY) return TODO_MAX_PRIORITY
  return v as TodoPriorityLevel
}

function parseItem(raw: unknown): TodoItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id : ''
  const title = typeof r.title === 'string' ? r.title.trim() : ''
  if (!id || !title) return null

  const isoOrNull = (v: unknown) =>
    typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null

  let scheduledDate = typeof r.scheduledDate === 'string' ? r.scheduledDate : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    const fromDeadline = isoOrNull(r.deadlineAt)
    scheduledDate = fromDeadline ? toYmdLocal(new Date(fromDeadline)) : toYmdLocal(new Date())
  }

  const priority = clampPriority(typeof r.priority === 'number' ? r.priority : 1)

  const createdAt = isoOrNull(r.createdAt) ?? new Date().toISOString()

  return {
    id,
    title,
    scheduledDate,
    deadlineAt: isoOrNull(r.deadlineAt),
    reminderAt: isoOrNull(r.reminderAt),
    reminderFiredAt: isoOrNull(r.reminderFiredAt),
    priority,
    tags: normalizeTodoTags(r.tags),
    completedAt: isoOrNull(r.completedAt),
    createdAt,
  }
}

function migrateLegacyIfNeeded(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    const items = parsed.map(parseItem).filter((t): t is TodoItem => t != null)
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  } catch {
    /* ignore */
  }
}

export function loadTodos(): TodoItem[] {
  migrateLegacyIfNeeded()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(parseItem).filter((t): t is TodoItem => t != null)
  } catch {
    return []
  }
}

export function saveTodos(items: TodoItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    notify()
  } catch {
    /* quota */
  }
}

export function sortTodos(items: TodoItem[]): TodoItem[] {
  const incomplete = items.filter((t) => !t.completedAt)
  const complete = items.filter((t) => t.completedAt)

  const cmp = (a: TodoItem, b: TodoItem) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    const ad = a.deadlineAt ? Date.parse(a.deadlineAt) : Number.POSITIVE_INFINITY
    const bd = b.deadlineAt ? Date.parse(b.deadlineAt) : Number.POSITIVE_INFINITY
    if (ad !== bd) return ad - bd
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  }

  incomplete.sort(cmp)
  complete.sort(
    (a, b) =>
      Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt),
  )
  return [...incomplete, ...complete]
}

export type AddTodoInput = {
  title: string
  scheduledDate: string
  deadlineAt?: string | null
  reminderAt?: string | null
  priority?: TodoPriorityLevel
  tags?: TodoTagId[]
}

export function addTodo(input: AddTodoInput): TodoItem {
  const item: TodoItem = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    scheduledDate: input.scheduledDate,
    deadlineAt: input.deadlineAt ?? null,
    reminderAt: input.reminderAt ?? null,
    reminderFiredAt: null,
    priority: clampPriority(input.priority ?? 1),
    tags: input.tags ?? [],
    completedAt: null,
    createdAt: new Date().toISOString(),
  }
  saveTodos(sortTodos([...loadTodos(), item]))
  return item
}

export function updateTodo(
  id: string,
  patch: Partial<
    Pick<
      TodoItem,
      | 'title'
      | 'scheduledDate'
      | 'deadlineAt'
      | 'reminderAt'
      | 'reminderFiredAt'
      | 'priority'
      | 'tags'
    >
  >,
): void {
  const items = loadTodos()
  const next = items.map((t) => {
    if (t.id !== id) return t
    const merged = { ...t, ...patch }
    if (patch.priority != null) merged.priority = clampPriority(patch.priority)
    if (patch.reminderAt != null && patch.reminderAt !== t.reminderAt) {
      merged.reminderFiredAt = null
    }
    return merged
  })
  saveTodos(sortTodos(next))
}

/** 批量更新待办标题（一键优化） */
export function batchUpdateTodoTitles(updates: Record<string, string>): number {
  let count = 0
  const next = loadTodos().map((t) => {
    const title = updates[t.id]?.trim()
    if (!title || title === t.title) return t
    count++
    return { ...t, title }
  })
  if (count > 0) saveTodos(sortTodos(next))
  return count
}

export function setTodoCompleted(id: string, completed: boolean): void {
  const items = loadTodos()
  const next = items.map((t) =>
    t.id === id
      ? { ...t, completedAt: completed ? new Date().toISOString() : null }
      : t,
  )
  saveTodos(sortTodos(next))
}

export function markTodoReminderFired(id: string): void {
  updateTodo(id, { reminderFiredAt: new Date().toISOString() })
}

export function deleteTodo(id: string): void {
  saveTodos(loadTodos().filter((t) => t.id !== id))
}

export function todosDueForReminder(nowMs: number): TodoItem[] {
  return loadTodos().filter((t) => {
    if (t.completedAt || !t.reminderAt || t.reminderFiredAt) return false
    const at = Date.parse(t.reminderAt)
    return !Number.isNaN(at) && at <= nowMs
  })
}
