import type { TodoPriorityLevel } from '../../lib/todoStore'

export function TodoStarRating({
  value,
  onChange,
  disabled = false,
  size = 'md',
  emphasized = false,
}: {
  value: TodoPriorityLevel
  onChange?: (v: TodoPriorityLevel) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  emphasized?: boolean
}) {
  const starClass =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
  const activeStar = emphasized ? 'text-amber-600 drop-shadow-sm' : 'text-amber-500'
  return (
    <span className="inline-flex items-center gap-0.5" role="group" aria-label={`优先等级 ${value} 星`}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled || !onChange}
          onClick={() => onChange?.(n)}
          className={[
            starClass,
            'leading-none transition',
            n <= value ? activeStar : 'text-ganshale-track',
            onChange && !disabled ? 'hover:scale-110' : 'cursor-default',
          ].join(' ')}
          aria-label={`${n} 星`}
        >
          ★
        </button>
      ))}
    </span>
  )
}

export function TodoStarsReadonly({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  return <TodoStarRating value={Math.min(5, Math.max(1, value)) as TodoPriorityLevel} disabled size={size} />
}
