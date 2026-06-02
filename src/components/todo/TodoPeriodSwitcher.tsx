import { TODO_PERIOD_META, type TodoPeriod } from '../../lib/todoCalendar'

const PERIOD_LABEL: Record<TodoPeriod, string> = {
  week: '本周',
  month: '本月',
  quarter: '季度',
  year: '年度',
}

const ORDER: TodoPeriod[] = ['week', 'month', 'quarter', 'year']

export function TodoPeriodSwitcher({
  period,
  onChange,
}: {
  period: TodoPeriod
  onChange: (p: TodoPeriod) => void
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {ORDER.map((id) => {
        const on = period === id
        return (
          <button
            key={id}
            type="button"
            title={TODO_PERIOD_META[id].tooltip}
            onClick={() => onChange(id)}
            className={[
              'rounded-lg px-2.5 py-1 text-[11px] font-medium transition',
              on
                ? 'bg-ganshale-text text-white shadow-sm'
                : 'bg-ganshale-page text-ganshale-muted ring-1 ring-ganshale-border hover:text-ganshale-text',
            ].join(' ')}
          >
            {PERIOD_LABEL[id]}
          </button>
        )
      })}
    </div>
  )
}
