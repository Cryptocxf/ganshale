import { ArrowDown, ArrowUp, CheckCircle2, Circle, ListTodo, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDeadlineLabel } from '../../lib/todoCountdown'
import { isTodoInPeriod, type TodoPeriod } from '../../lib/todoCalendar'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../../lib/dashboardSectionDescriptions'
import { deleteTodo, setTodoCompleted, type TodoItem } from '../../lib/todoStore'
import { DashboardSectionTitle } from '../DashboardSectionTitle'
import {
  DASHBOARD_CARD_INSET_X,
  DASHBOARD_CARD_INSET_TOP,
} from '../dashboardLayout'
import { TodoStarsReadonly } from './TodoStarRating'
import { TodoPeriodSwitcher } from './TodoPeriodSwitcher'

type SortField = 'time' | 'priority'
type SortDirection = 'asc' | 'desc'

function sortTimeMs(item: TodoItem): number {
  if (item.deadlineAt) {
    const t = Date.parse(item.deadlineAt)
    if (!Number.isNaN(t)) return t
  }
  const d = Date.parse(`${item.scheduledDate}T23:59:59`)
  return Number.isNaN(d) ? 0 : d
}

function SortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onToggle,
}: {
  label: string
  field: SortField
  sortField: SortField
  sortDirection: SortDirection
  onToggle: (field: SortField) => void
}) {
  const active = sortField === field
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className="inline-flex w-full items-center justify-center gap-0.5 text-ganshale-subtle transition hover:text-ganshale-text"
    >
      <span>{label}</span>
      <span className="inline-flex flex-col leading-none" aria-hidden>
        <ArrowUp
          className={[
            'h-2.5 w-2.5',
            active && sortDirection === 'asc' ? 'text-ganshale-text' : 'text-ganshale-muted/35',
          ].join(' ')}
          strokeWidth={2.5}
        />
        <ArrowDown
          className={[
            '-mt-0.5 h-2.5 w-2.5',
            active && sortDirection === 'desc' ? 'text-ganshale-text' : 'text-ganshale-muted/35',
          ].join(' ')}
          strokeWidth={2.5}
        />
      </span>
    </button>
  )
}

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
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const onSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'priority' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(() => {
    const visible = items.filter((t) => isTodoInPeriod(t, period, new Date(nowMs)))
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...visible].sort((a, b) => {
      if (sortField === 'priority') {
        if (a.priority !== b.priority) return (a.priority - b.priority) * dir
        return sortTimeMs(a) - sortTimeMs(b)
      }
      const ta = sortTimeMs(a)
      const tb = sortTimeMs(b)
      if (ta !== tb) return (ta - tb) * dir
      return b.priority - a.priority
    })
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
                <SortHeader
                  label="时间"
                  field="time"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggle={onSortToggle}
                />
              </th>
              <th className="w-[5.5rem] px-2 py-2 text-center">
                <SortHeader
                  label="优先等级"
                  field="priority"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggle={onSortToggle}
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
