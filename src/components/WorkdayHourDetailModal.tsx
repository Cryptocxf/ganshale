import { useMemo } from 'react'
import { Clock3, X } from 'lucide-react'
import type { TimelineSeg } from '../lib/aggregations'
import {
  legendEntriesForHour,
  minuteCellsForHour,
} from '../lib/workdayHourDetail'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'

/** 与日看板 WorkdayTimeline 时间条一致 */
const HOUR_DETAIL_TRACK_CLASS =
  'relative h-12 w-full shrink-0 overflow-hidden rounded-md bg-ganshale-track/90 ring-1 ring-ganshale-border sm:h-14'
const HOUR_DETAIL_TICK_CLASS =
  'absolute top-0 text-[11px] leading-snug tabular-nums text-ganshale-muted'
/** 分钟小格描边：略深于轨道，不改变格子底色 */
const HOUR_DETAIL_CELL_RING_CLASS = 'ring-1 ring-inset ring-ganshale-text/20'
const HOUR_DETAIL_BLOCK_DIVIDER_CLASS = 'border-l border-ganshale-text/28'
const MINUTES_PER_TICK_BLOCK = 10
const TICK_BLOCK_COUNT = 60 / MINUTES_PER_TICK_BLOCK

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
    <DashboardModalRoot
      open
      onClose={onClose}
      labelledBy="workday-hour-detail-title"
      dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
    >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
        >
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
          <DashboardSectionSubtitle className="mb-2 pl-0 sm:pl-0">
            横轴为该小时内每分钟（共 60 格）
          </DashboardSectionSubtitle>
          <div className={HOUR_DETAIL_TRACK_CLASS} role="img" aria-label={`${formatHourRange(hour)} 分钟分布`}>
            <div className="absolute inset-0 flex">
              {Array.from({ length: TICK_BLOCK_COUNT }, (_, block) => {
                const blockCells = cells.slice(
                  block * MINUTES_PER_TICK_BLOCK,
                  block * MINUTES_PER_TICK_BLOCK + MINUTES_PER_TICK_BLOCK,
                )
                return (
                  <div
                    key={block}
                    className={[
                      'flex min-h-0 min-w-0 flex-1 gap-px',
                      block > 0 ? HOUR_DETAIL_BLOCK_DIVIDER_CLASS : '',
                    ].join(' ')}
                  >
                    {blockCells.map((cell) => (
                      <div
                        key={cell.minuteIndex}
                        title={
                          cell.label
                            ? `${String(hour).padStart(2, '0')}:${String(cell.minuteIndex).padStart(2, '0')} · ${cell.label}`
                            : `${String(hour).padStart(2, '0')}:${String(cell.minuteIndex).padStart(2, '0')}`
                        }
                        className={[
                          'min-h-0 min-w-0 flex-1 rounded-[1px]',
                          HOUR_DETAIL_CELL_RING_CLASS,
                          !cell.color ? 'bg-ganshale-border/25' : 'border-r border-ganshale-text/25',
                        ].join(' ')}
                        style={cell.color ? { backgroundColor: cell.color } : undefined}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="relative mt-1.5 h-9 w-full shrink-0 sm:h-10">
            {[0, 10, 20, 30, 40, 50, 60].map((m) => {
              const left = m === 60 ? 100 : (m / 60) * 100
              const isFirst = m === 0
              const isLast = m === 60
              return (
                <span
                  key={m}
                  className={[
                    HOUR_DETAIL_TICK_CLASS,
                    isFirst
                      ? 'left-0 translate-x-0'
                      : isLast
                        ? 'left-full -translate-x-full'
                        : '-translate-x-1/2',
                  ].join(' ')}
                  style={isFirst || isLast ? undefined : { left: `${left}%` }}
                >
                  {m === 60
                    ? `${String(hour + 1).padStart(2, '0')}:00`
                    : `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
                </span>
              )
            })}
          </div>
        </div>
    </DashboardModalRoot>
  )
}
