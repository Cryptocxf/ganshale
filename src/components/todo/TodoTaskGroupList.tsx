import { useMemo } from 'react'
import {
  groupTodosByStatus,
  TODO_GROUP_META,
  type TodoGroupId,
  type TodoViewTab,
} from '../../lib/todoView'
import type { TodoItem } from '../../lib/todoStore'
import { TodoTaskCard } from './TodoTaskCard'

const GROUP_ORDER: TodoGroupId[] = ['in_progress', 'pending', 'completed']

export function TodoTaskGroupList({
  items,
  tab,
  nowMs,
}: {
  items: TodoItem[]
  tab: TodoViewTab
  nowMs: number
}) {
  const groups = useMemo(
    () => groupTodosByStatus(items, tab, nowMs),
    [items, tab, nowMs],
  )

  const hasAny = GROUP_ORDER.some((id) => groups[id].length > 0)

  if (!hasAny) {
    return (
      <p className="py-12 text-center text-sm text-ganshale-muted">
        当前范围暂无待办，点击右上角「新建」添加
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((groupId) => {
        const list = groups[groupId]
        if (list.length === 0) return null
        const meta = TODO_GROUP_META[groupId]
        return (
          <section key={groupId} aria-labelledby={`todo-group-${groupId}`}>
            <div className="mb-2 flex items-center gap-2">
              <h2
                id={`todo-group-${groupId}`}
                className="text-sm font-semibold text-ganshale-text"
              >
                {meta.title}
              </h2>
              <span className="todo-group-badge">{list.length}</span>
            </div>
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <TodoTaskCard item={item} nowMs={nowMs} tab={tab} groupId={groupId} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
