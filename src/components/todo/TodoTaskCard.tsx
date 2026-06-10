import { Check, Clock, Trash2 } from 'lucide-react'
import { memo } from 'react'
import {
  priorityBandFromLevel,
  priorityBarClass,
  tagLabel,
  tagPillClass,
} from '../../lib/todoTags'
import {
  formatTodoTimeLabel,
} from '../../lib/todoView'
import { deleteTodo, setTodoCompleted, type TodoItem } from '../../lib/todoStore'
import { TodoStarsReadonly } from './TodoStarRating'

export const TodoTaskCard = memo(function TodoTaskCard({
  item,
  nowMs,
}: {
  item: TodoItem
  nowMs: number
}) {
  const done = Boolean(item.completedAt)
  const band = priorityBandFromLevel(item.priority)
  const time = formatTodoTimeLabel(item, nowMs)

  return (
    <article
      className={[
        'todo-task-card group/card flex overflow-hidden',
        done ? 'todo-task-card--done' : '',
      ].join(' ')}
    >
      <div className={priorityBarClass(band)} aria-hidden />
      <div className="flex min-w-0 flex-1 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 gap-2.5">
          <button
            type="button"
            className={['todo-check mt-0.5', done ? 'todo-check--on' : ''].join(' ')}
            onClick={() => setTodoCompleted(item.id, !done)}
            aria-label={done ? '标为未完成' : '完成'}
          >
            {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className={[
                  'min-w-0 flex-1 text-[13px] leading-snug text-ganshale-text',
                  done ? 'line-through decoration-ganshale-muted' : 'font-medium',
                ].join(' ')}
              >
                {item.title}
              </p>
              <TodoStarsReadonly value={item.priority} size="sm" compact />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {item.tags.map((tag) => (
                <span key={tag} className={tagPillClass(tag)}>
                  {tagLabel(tag)}
                </span>
              ))}
              <span className="inline-flex items-center gap-0.5 text-[10px] text-ganshale-muted">
                {time.completed ? (
                  <Check className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} />
                ) : (
                  <Clock className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.75} />
                )}
                {time.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => deleteTodo(item.id)}
            className="mt-0.5 shrink-0 rounded p-1 text-ganshale-subtle opacity-0 transition hover:text-rose-600 group-hover/card:opacity-100 focus:opacity-100"
            aria-label="删除待办"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  )
})
