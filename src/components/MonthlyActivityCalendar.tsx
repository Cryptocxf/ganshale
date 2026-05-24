import { CalendarDays } from 'lucide-react'
import { formatDurationHmsZh } from '../lib/aggregations'
import type { MonthlyDayCell } from '../lib/monthlyWorktime'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP } from './dashboardLayout'

const WEEKDAY_HEADER = ['一', '二', '三', '四', '五', '六', '日'] as const

function monthCellClass(cell: MonthlyDayCell): string {
  if (cell.isOutsideMonth) return 'gs-month-cell gs-month-cell--outside'
  if (cell.isFuture) return 'gs-month-cell gs-month-cell--future'
  if (cell.seconds <= 0) return 'gs-month-cell gs-month-cell--empty'
  return `gs-month-cell gs-month-cell--tier-${cell.intensityTier}`
}

export function MonthlyActivityCalendar({
  monthAnchor,
  cells,
  onDayClick,
}: {
  monthAnchor: Date
  cells: MonthlyDayCell[]
  onDayClick?: (date: string) => void
}) {
  const monthLabel = `${monthAnchor.getMonth() + 1}月活跃日历`

  return (
    <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className={[DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP, 'shrink-0 pb-0.5'].join(' ')}>
        <DashboardSectionTitle
          icon={CalendarDays}
          description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyActivityCalendar}
        >
          {monthLabel}
        </DashboardSectionTitle>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-1 sm:px-2.5 sm:pb-1.5">
        <div className="mt-1.5 flex min-h-0 flex-1 flex-col sm:mt-2">
          <div className="mb-0.5 shrink-0 grid grid-cols-7 gap-0.5 text-center text-[8px] font-medium text-ganshale-subtle">
            {WEEKDAY_HEADER.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-0.5">
          {cells.map((cell) => {
            const clickable =
              !cell.isOutsideMonth && !cell.isFuture && onDayClick != null

            return (
              <button
                key={cell.date}
                type="button"
                disabled={!clickable}
                title={
                  cell.isOutsideMonth
                    ? undefined
                    : `${cell.date} · ${formatDurationHmsZh(cell.seconds)}`
                }
                onClick={() => {
                  if (clickable) onDayClick?.(cell.date)
                }}
                className={[
                  monthCellClass(cell),
                  'flex h-full min-h-[1.75rem] w-full flex-col items-center justify-center rounded text-[9px] tabular-nums transition sm:min-h-[1.875rem]',
                  cell.isToday && !cell.isOutsideMonth
                    ? 'gs-month-cell--today ring-1 ring-ganshale-accent/55 ring-inset'
                    : '',
                  clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{cell.dayOfMonth}</span>
              </button>
            )
          })}
          </div>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-1 py-0.5">
          <span className="text-[10px] font-medium leading-none text-ganshale-text">强度</span>
          {[1, 2, 3, 4].map((t) => (
            <span
              key={t}
              className={`gs-month-cell gs-month-cell--tier-${t} inline-block h-2.5 w-2.5 rounded-sm`}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  )
}
