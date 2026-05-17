import { useMemo } from 'react'
import { Clock3, X } from 'lucide-react'
import type { TimelineSeg } from '../lib/aggregations'
import {
  legendEntriesForHour,
  minuteCellsForHour,
} from '../lib/workdayHourDetail'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SHELL_CLASS,
} from './dashboardLayout'

function formatHourRange(hour: number): string {
  const pad = (h: number) => String(h).padStart(2, '0')
  return `${pad(hour)}:00 — ${pad(hour + 1)}:00`
}

type WorkdayHourDetailModalProps = {
  hour: number
  timeline: TimelineSeg[]
  onClose: () => void
}

export function WorkdayHourDetailModal({ hour, timeline, onClose }: WorkdayHourDetailModalProps) {
  const cells = useMemo(() => minuteCellsForHour(hour, timeline), [hour, timeline])
  const legend = useMemo(() => legendEntriesForHour(hour, timeline), [hour, timeline])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={DASHBOARD_DETAIL_MODAL_SHELL_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workday-hour-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-2 py-1.5 sm:px-3">
          <DashboardSectionTitle id="workday-hour-detail-title" icon={Clock3}>
            {formatHourRange(hour)}
          </DashboardSectionTitle>
          <div className="flex shrink-0 items-start gap-2">
            {legend.length > 0 ? (
              <div className="flex max-w-[min(100%,20rem)] flex-wrap items-center justify-end gap-x-2 gap-y-0.5 pt-0.5">
                {legend.map(({ label, color }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 text-[10px] text-ganshale-muted"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
              aria-label="关闭"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
          <p className="mb-2 text-[10px] text-ganshale-muted">横轴为该小时内每分钟（共 60 格）</p>
          <div className="rounded-xl bg-ganshale-track/90 p-2 ring-1 ring-black/[0.04]">
            <div
              className="flex h-12 w-full gap-px sm:h-14"
              role="img"
              aria-label={`${formatHourRange(hour)} 分钟分布`}
            >
              {cells.map((cell) => (
                <div
                  key={cell.minuteIndex}
                  title={
                    cell.label
                      ? `${String(hour).padStart(2, '0')}:${String(cell.minuteIndex).padStart(2, '0')} · ${cell.label}`
                      : `${String(hour).padStart(2, '0')}:${String(cell.minuteIndex).padStart(2, '0')}`
                  }
                  className={[
                    'min-w-0 flex-1 rounded-[1px] ring-1 ring-black/[0.03]',
                    !cell.color ? 'bg-black/[0.04]' : '',
                  ].join(' ')}
                  style={cell.color ? { backgroundColor: cell.color } : undefined}
                />
              ))}
            </div>
            <div className="relative mt-2 h-5 w-full">
              {[0, 10, 20, 30, 40, 50, 60].map((m) => {
                const left = m === 60 ? 100 : (m / 60) * 100
                return (
                  <span
                    key={m}
                    className={[
                      'absolute top-0 -translate-x-1/2 text-[8px] tabular-nums text-ganshale-subtle',
                      m === 60 ? '-translate-x-full' : '',
                    ].join(' ')}
                    style={{ left: `${left}%` }}
                  >
                    {m === 60
                      ? `${String(hour + 1).padStart(2, '0')}:00`
                      : `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
