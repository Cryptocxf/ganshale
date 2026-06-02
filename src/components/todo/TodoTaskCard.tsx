import { Check, Clock } from 'lucide-react'
import { memo } from 'react'
import {
  priorityBandFromLevel,
  priorityBarClass,
  tagLabel,
  tagPillClass,
} from '../../lib/todoTags'
import {
  formatTodoCardCornerTime,
  formatTodoTimeLabel,
  type TodoGroupId,
  type TodoViewTab,
} from '../../lib/todoView'
import { setTodoCompleted, type TodoItem } from '../../lib/todoStore'

export const TodoTaskCard = memo(function TodoTaskCard({
  item,
  nowMs,
  tab,
  groupId,
}: {
  item: TodoItem
  nowMs: number
  tab: TodoViewTab
  groupId: TodoGroupId
}) {
  const done = Boolean(item.completedAt)
  const band = priorityBandFromLevel(item.priority)
  const time = formatTodoTimeLabel(item, nowMs)
  const showCornerTime = groupId === 'pending' || groupId === 'completed'
  const cornerMs = done
    ? item.completedAt
      ? Date.parse(item.completedAt)
      : NaN
    : item.deadlineAt
      ? Date.parse(item.deadlineAt)
      : Date.parse(item.createdAt)
  const cornerTime =
    showCornerTime && !Number.isNaN(cornerMs)
      ? formatTodoCardCornerTime(cornerMs, tab, nowMs)
      : null

  return (
    <article
      className={['todo-task-card flex overflow-hidden', done ? 'todo-task-card--done' : ''].join(
        ' ',
      )}
    >
      <div className={priorityBarClass(band)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5">
        <div className="flex min-w-0 gap-2.5">
          <button
            type="button"
            className={['todo-check mt-0.5', done ? 'todo-check--on' : ''].join(' ')}
            onClick={() => setTodoCompleted(item.id, !done)}
            aria-label={done ? '标为未完成' : '完成'}
          >
            {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={[
                'text-[13px] leading-snug text-ganshale-text',
                done ? 'line-through decoration-ganshale-muted' : 'font-medium',
              ].join(' ')}
            >
              {item.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className={tagPillClass(tag)}>
                  {tagLabel(tag)}
                </span>
              ))}
              {groupId === 'in_progress' ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-ganshale-muted">
                  {time.completed ? (
                    <Check className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} />
                  ) : (
                    <Clock className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.75} />
                  )}
                  {time.text}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {cornerTime ? (
          <p className="self-end font-mono text-[10px] tabular-nums text-ganshale-muted">
            {cornerTime}
          </p>
        ) : null}
      </div>
    </article>
  )
})
