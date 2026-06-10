import { CheckCircle2, Circle, ListTodo, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDeadlineLabel } from '../../lib/todoCountdown'
import { isTodoInPeriod, type TodoPeriod } from '../../lib/todoCalendar'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../../lib/dashboardSectionDescriptions'
import { deleteTodo, setTodoCompleted, type TodoItem } from '../../lib/todoStore'
import {
  nextTodoSortState,
  sortTodoItems,
  type TodoSortDirection,
  type TodoSortField,
} from '../../lib/todoSort'
import { DashboardSectionTitle } from '../DashboardSectionTitle'
import {
  DASHBOARD_CARD_INSET_X,
  DASHBOARD_CARD_INSET_TOP,
} from '../dashboardLayout'
import { TodoSortHeader } from './TodoSortHeader'
import { TodoStarsReadonly } from './TodoStarRating'
import { TodoPeriodSwitcher } from './TodoPeriodSwitcher'

export function TodoListPanel({
  items,
  period,
  onPeriodChange,
  nowMs,
}: {
  items: TodoItem[]
  period: TodoPeriod
  onPeriodChange: (p: TodoPeriod) => void
  nowMs: number
}) {
  const [sortField, setSortField] = useState<TodoSortField>('time')
  const [sortDirection, setSortDirection] = useState<TodoSortDirection>('asc')

  const onSortToggle = (field: TodoSortField) => {
    const next = nextTodoSortState(field, sortField, sortDirection)
    setSortField(next.field)
    setSortDirection(next.direction)
  }

  const sorted = useMemo(() => {
    const visible = items.filter((t) => isTodoInPeriod(t, period, new Date(nowMs)))
    return sortTodoItems(visible, sortField, sortDirection, 'deadline')
  }, [items, period, nowMs, sortField, sortDirection])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={[
          DASHBOARD_CARD_INSET_X,
          DASHBOARD_CARD_INSET_TOP,
          'mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2',
        ].join(' ')}
      >
        <DashboardSectionTitle
          icon={ListTodo}
          description={DASHBOARD_SECTION_DESCRIPTIONS.todoList}
        >
          待办列表
        </DashboardSectionTitle>
        <TodoPeriodSwitcher period={period} onChange={onPeriodChange} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-3 sm:px-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ganshale-border">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left text-[11px]">
          <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page font-medium text-ganshale-subtle">
            <tr>
              <th className="w-10 px-2 py-2 text-center">序号</th>
              <th className="min-w-[10rem] px-2 py-2">内容</th>
              <th className="w-[7.5rem] px-2 py-2 text-center">
                <TodoSortHeader
                  label="时间"
                  field="time"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggle={onSortToggle}
                  className="w-full justify-center"
                />
              </th>
              <th className="w-[5.5rem] px-2 py-2 text-center">
                <TodoSortHeader
                  label="优先等级"
                  field="priority"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggle={onSortToggle}
                  className="w-full justify-center"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ganshale-border bg-ganshale-surface">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-sm text-ganshale-muted">
                  当前范围暂无待办
                </td>
              </tr>
            ) : (
              sorted.map((item, index) => {
                const done = Boolean(item.completedAt)
                const timeLabel = item.deadlineAt
                  ? formatDeadlineLabel(item.deadlineAt)
                  : item.scheduledDate

                return (
                  <tr
                    key={item.id}
                    className={[
                      'group',
                      done ? 'text-ganshale-muted' : 'text-ganshale-text',
                    ].join(' ')}
                  >
                    <td className="px-2 py-2 text-center tabular-nums text-ganshale-subtle">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTodoCompleted(item.id, !done)}
                            className="mt-0.5 shrink-0 text-ganshale-muted"
                            aria-label={done ? '标为未完成' : '完成'}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Circle className="h-4 w-4" strokeWidth={1.75} />
                            )}
                          </button>
                          <span
                            className={[
                              'min-w-0 leading-snug',
                              done ? 'line-through' : 'font-medium',
                            ].join(' ')}
                          >
                            {item.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTodo(item.id)}
                          className="shrink-0 rounded p-0.5 text-ganshale-subtle opacity-0 transition hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                          aria-label="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-center tabular-nums text-ganshale-muted">
                      {timeLabel}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex justify-center">
                        <TodoStarsReadonly value={item.priority} size="sm" />
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
