import { ArrowDown, ArrowUp } from 'lucide-react'
import type { TodoSortDirection, TodoSortField } from '../../lib/todoSort'

export function TodoSortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onToggle,
  className = '',
}: {
  label: string
  field: TodoSortField
  sortField: TodoSortField
  sortDirection: TodoSortDirection
  onToggle: (field: TodoSortField) => void
  className?: string
}) {
  const active = sortField === field
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={[
        'inline-flex items-center gap-0.5 text-ganshale-subtle transition hover:text-ganshale-text',
        className,
      ].join(' ')}
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

export function TodoSortToolbar({
  sortField,
  sortDirection,
  onToggle,
  className = '',
}: {
  sortField: TodoSortField
  sortDirection: TodoSortDirection
  onToggle: (field: TodoSortField) => void
  className?: string
}) {
  return (
    <div
      className={[
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]',
        className,
      ].join(' ')}
      role="group"
      aria-label="排序"
    >
      <span className="text-ganshale-muted">排序</span>
      <TodoSortHeader
        label="时间"
        field="time"
        sortField={sortField}
        sortDirection={sortDirection}
        onToggle={onToggle}
      />
      <TodoSortHeader
        label="优先级"
        field="priority"
        sortField={sortField}
        sortDirection={sortDirection}
        onToggle={onToggle}
      />
    </div>
  )
}
