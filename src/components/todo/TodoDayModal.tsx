import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  buildTodoCountdown,
  countdownBadgeClass,
  formatDeadlineLabel,
  fromDatetimeLocalValue,
} from '../../lib/todoCountdown'
import { toYmdLocal } from '../../lib/timeutil'
import type { TodoCalendarCell, TodoPeriod } from '../../lib/todoCalendar'
import { matchesCell } from '../../lib/todoCalendar'
import {
  addTodo,
  deleteTodo,
  setTodoCompleted,
  type TodoItem,
  type TodoPriorityLevel,
} from '../../lib/todoStore'
import { useTodoClockMs } from '../../hooks/useTodos'
import { DashboardModalRoot } from '../DashboardModalRoot'
import { GS_FIELD_INPUT_MD_CLASS } from '../dashboardLayout'
import { TodoStarRating, TodoStarsReadonly } from './TodoStarRating'

function defaultScheduledForCell(cell: TodoCalendarCell, period: TodoPeriod): string {
  if (period === 'week' || period === 'month') {
    return cell.dateYmd ?? toYmdLocal(new Date())
  }
  const today = toYmdLocal(new Date())
  if (cell.monthPrefix && today.startsWith(cell.monthPrefix)) return today
  return cell.dateYmd ?? `${cell.monthPrefix}-01`
}

export function TodoDayModal({
  open,
  onClose,
  cell,
  period,
  items,
}: {
  open: boolean
  onClose: () => void
  cell: TodoCalendarCell | null
  period: TodoPeriod
  items: TodoItem[]
}) {
  const nowMs = useTodoClockMs()
  const [draft, setDraft] = useState('')
  const [deadline, setDeadline] = useState('')
  const [reminder, setReminder] = useState('')
  const [priority, setPriority] = useState<TodoPriorityLevel>(1)

  const cellItems = useMemo(() => {
    if (!cell) return []
    return items.filter((t) => matchesCell(t, cell, period))
  }, [items, cell, period])

  useEffect(() => {
    if (!open) return
    setDraft('')
    setDeadline('')
    setReminder('')
    setPriority(1)
  }, [open, cell?.key])

  if (!cell) return null

  const isMonthScope = period === 'quarter' || period === 'year'
  const title = isMonthScope
    ? `${cell.label}待办`
    : `${cell.sublabel ?? ''} ${cell.label}`.trim()

  const submit = () => {
    const titleText = draft.trim()
    if (!titleText) return
    addTodo({
      title: titleText,
      scheduledDate: defaultScheduledForCell(cell, period),
      deadlineAt: fromDatetimeLocalValue(deadline),
      reminderAt: fromDatetimeLocalValue(reminder),
      priority,
    })
    setDraft('')
    setDeadline('')
    setReminder('')
    setPriority(1)
  }

  return (
    <DashboardModalRoot
      open={open}
      onClose={onClose}
      dialogClassName="max-h-[min(88vh,720px)] w-full max-w-lg"
      labelledBy="todo-day-modal-title"
    >
      <div className="flex min-h-0 flex-col">
        <header className="gs-dashboard-modal__divider-b shrink-0 px-4 py-3">
          <h2
            id="todo-day-modal-title"
            className="font-display text-sm font-semibold text-ganshale-text"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-ganshale-muted">
            {isMonthScope ? '该月全部待办' : `归属日 ${cell.dateYmd}`} · {cellItems.length} 条
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <section className="mb-4 rounded-lg border border-ganshale-border bg-ganshale-page/60 p-3">
            <p className="mb-2 text-[11px] font-semibold text-ganshale-text">新建待办</p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="待办内容…"
              className={[GS_FIELD_INPUT_MD_CLASS, 'mb-2 resize-none text-sm'].join(' ')}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[10px] font-medium text-ganshale-muted">
                完成时间
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={GS_FIELD_INPUT_MD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] font-medium text-ganshale-muted">
                提醒时间
                <input
                  type="datetime-local"
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  className={GS_FIELD_INPUT_MD_CLASS}
                />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] text-ganshale-muted">
                <span>优先等级</span>
                <TodoStarRating value={priority} onChange={setPriority} />
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-ganshale-text px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                添加
              </button>
            </div>
          </section>

          {cellItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-ganshale-muted">暂无待办</p>
          ) : (
            <ul className="space-y-2">
              {cellItems.map((item) => {
                const done = Boolean(item.completedAt)
                const countdown = buildTodoCountdown(item.deadlineAt, item.completedAt, nowMs)
                return (
                  <li
                    key={item.id}
                    className="group flex gap-2 rounded-lg border border-ganshale-border bg-ganshale-surface px-2.5 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => setTodoCompleted(item.id, !done)}
                      className="mt-0.5 shrink-0 text-ganshale-muted"
                      aria-label={done ? '标为未完成' : '完成'}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5" strokeWidth={1.75} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={[
                            'text-sm text-ganshale-text',
                            done ? 'line-through text-ganshale-muted' : 'font-medium',
                          ].join(' ')}
                        >
                          {item.title}
                        </p>
                        <TodoStarsReadonly value={item.priority} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-ganshale-subtle">
                        归属 {item.scheduledDate} · 截止 {formatDeadlineLabel(item.deadlineAt)}
                        {item.reminderAt
                          ? ` · 提醒 ${formatDeadlineLabel(item.reminderAt)}`
                          : ''}
                      </p>
                      <span
                        className={[
                          'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                          countdownBadgeClass(countdown.tone),
                        ].join(' ')}
                      >
                        {countdown.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTodo(item.id)}
                      className="shrink-0 rounded p-1 text-ganshale-subtle opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardModalRoot>
  )
}
