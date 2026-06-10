import {
  TODO_MAX_PRIORITY,
  TODO_MIN_PRIORITY,
  TODO_PRIORITY_LEVELS,
  type TodoPriorityLevel,
} from '../../lib/todoStore'

/** 第 n 颗星（1–10）选中时的颜色：序号越大越深 */
function priorityStarColor(starIndex: number, emphasized: boolean): string {
  const t = (starIndex - TODO_MIN_PRIORITY) / (TODO_MAX_PRIORITY - TODO_MIN_PRIORITY)
  const lightness = emphasized ? 68 - t * 38 : 74 - t * 42
  const saturation = emphasized ? 88 : 82
  return `hsl(32 ${saturation}% ${lightness}%)`
}

function normalizePriority(value: number): TodoPriorityLevel {
  const v = Math.round(value)
  if (v <= TODO_MIN_PRIORITY) return TODO_MIN_PRIORITY
  if (v >= TODO_MAX_PRIORITY) return TODO_MAX_PRIORITY
  return v as TodoPriorityLevel
}

export function TodoStarRating({
  value,
  onChange,
  disabled = false,
  size = 'md',
  emphasized = false,
  compact = false,
}: {
  value: TodoPriorityLevel
  onChange?: (v: TodoPriorityLevel) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  emphasized?: boolean
  /** 列表卡片等窄空间：略缩小间距与字号 */
  compact?: boolean
}) {
  const starClass = compact
    ? 'text-[11px]'
    : size === 'sm'
      ? 'text-xs'
      : size === 'lg'
        ? 'text-lg sm:text-xl'
        : 'text-sm'
  const gapClass = compact ? 'gap-0' : 'gap-0.5'

  return (
    <span
      className={['inline-flex flex-wrap items-center', gapClass].join(' ')}
      role="group"
      aria-label={`优先等级 ${value} / ${TODO_MAX_PRIORITY} 星`}
    >
      {TODO_PRIORITY_LEVELS.map((n) => {
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            disabled={disabled || !onChange}
            onClick={() => onChange?.(n)}
            className={[
              starClass,
              'leading-none transition',
              filled ? '' : 'text-ganshale-track',
              onChange && !disabled ? 'hover:scale-110' : 'cursor-default',
            ].join(' ')}
            style={filled ? { color: priorityStarColor(n, emphasized) } : undefined}
            aria-label={`${n} 星`}
            aria-pressed={filled}
          >
            ★
          </button>
        )
      })}
    </span>
  )
}

export function TodoStarsReadonly({
  value,
  size = 'sm',
  compact = false,
}: {
  value: number
  size?: 'sm' | 'md'
  compact?: boolean
}) {
  return (
    <TodoStarRating
      value={normalizePriority(value)}
      disabled
      size={size}
      compact={compact}
    />
  )
}
