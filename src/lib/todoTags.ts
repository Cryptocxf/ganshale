export type TodoTagId = string

export const PRESET_TODO_TAG_IDS = ['work', 'design', 'meeting', 'review'] as const
export type PresetTodoTagId = (typeof PRESET_TODO_TAG_IDS)[number]

export const TODO_TAG_OPTIONS: { id: PresetTodoTagId; label: string }[] = [
  { id: 'work', label: '工作' },
  { id: 'design', label: '设计' },
  { id: 'meeting', label: '会议' },
  { id: 'review', label: '评审' },
]

const PRESET_TAG_IDS = new Set<string>(TODO_TAG_OPTIONS.map((o) => o.id))

export function isPresetTodoTagId(v: string): v is PresetTodoTagId {
  return PRESET_TAG_IDS.has(v)
}

export function normalizeTodoTags(raw: unknown): TodoTagId[] {
  if (!Array.isArray(raw)) return []
  const out: TodoTagId[] = []
  for (const t of raw) {
    if (typeof t !== 'string') continue
    const trimmed = t.trim()
    if (!trimmed || out.includes(trimmed)) continue
    out.push(trimmed)
  }
  return out
}

export function tagLabel(id: TodoTagId): string {
  return TODO_TAG_OPTIONS.find((o) => o.id === id)?.label ?? id
}

/** 标签 pill 样式（浅色模式；深色见 todo-page.css 覆盖） */
export function tagPillClass(id: TodoTagId): string {
  if (isPresetTodoTagId(id)) {
    return `todo-tag todo-tag--${id}`
  }
  return 'todo-tag todo-tag--custom'
}

export type TodoPriorityBand = 'high' | 'medium' | 'low'

export function priorityBandFromLevel(level: number): TodoPriorityBand {
  if (level >= 4) return 'high'
  if (level >= 3) return 'medium'
  return 'low'
}

export function priorityLevelFromBand(band: TodoPriorityBand): 1 | 3 | 5 {
  if (band === 'high') return 5
  if (band === 'medium') return 3
  return 1
}

export function priorityBarClass(band: TodoPriorityBand): string {
  switch (band) {
    case 'high':
      return 'todo-priority-bar todo-priority-bar--high'
    case 'medium':
      return 'todo-priority-bar todo-priority-bar--medium'
    case 'low':
      return 'todo-priority-bar todo-priority-bar--low'
  }
}
