import { useMemo } from 'react'
import { BarChart3, X } from 'lucide-react'
import { formatDurationCompactSec, formatDurationPreciseSec } from '../lib/aggregations'
import { formatBarDurationZh } from '../lib/weeklyWorktime'
import {
  barHeightPct,
  buildYTickHours,
  ceilYMaxHours,
  yTickBottomPct,
} from '../lib/weeklyDayBarChart'
import {
  isUncategorizedCategoryId,
  stackedSegmentLabels,
} from '../lib/categoryBarColors'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'

export type WeeklyDayDurationCategoryDetail = {
  id: string
  label: string
  color: string
  seconds: number
  apps: { exe: string; seconds: number }[]
}

export type WeeklyDayDurationDetail = {
  key: string
  weekday: string
  md: string
  totalSec: number
  segments: { id: string; label: string; seconds: number; color: string }[]
  categories: WeeklyDayDurationCategoryDetail[]
}

const Y_AXIS_W = 40
const LARGE_BAR_W = '6.5rem'

function barSecForDetail(detail: WeeklyDayDurationDetail): number {
  return detail.totalSec
}

type WeeklyDayDurationDetailModalProps = {
  detail: WeeklyDayDurationDetail
  onClose: () => void
}

export function WeeklyDayDurationDetailModal({
  detail,
  onClose,
}: WeeklyDayDurationDetailModalProps) {
  const barSec = barSecForDetail(detail)
  const yMaxHours = useMemo(() => ceilYMaxHours(barSec), [barSec])
  const yMaxSec = yMaxHours * 3600
  const yTickHours = useMemo(() => buildYTickHours(yMaxHours), [yMaxHours])
  const barPct = barHeightPct(barSec, yMaxSec)
  const labelSec = detail.totalSec > 0 ? detail.totalSec : 0

  const categoryTotalSec = useMemo(
    () => detail.categories.reduce((s, c) => s + c.seconds, 0),
    [detail.categories],
  )

  const segmentLabels = useMemo(
    () => stackedSegmentLabels(detail.segments, barSec),
    [detail.segments, barSec],
  )

  return (
    <DashboardModalRoot
      open
      onClose={onClose}
      labelledBy="weekly-day-duration-detail-title"
      dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
    >
      <div
        className={`flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
      >
        <DashboardSectionTitle id="weekly-day-duration-detail-title" icon={BarChart3}>
          {detail.weekday} {detail.md} 工作时长
        </DashboardSectionTitle>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
          aria-label="关闭"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
        <DashboardSectionSubtitle className="mb-3 pl-0 sm:pl-0">
          {labelSec > 0
            ? `当日办公总时长 ${formatDurationPreciseSec(labelSec)}`
            : '当日暂无工作时长记录'}
        </DashboardSectionSubtitle>

        <div className="grid min-h-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-5">
          <div className="flex min-h-[min(42vh,22rem)] min-w-0 flex-col pr-4 sm:pr-8">
            <div className="flex min-h-0 flex-1 gap-2">
              <div
                className="flex shrink-0 flex-col pt-2"
                style={{ width: Y_AXIS_W }}
                aria-hidden
              >
                <div className="relative min-h-0 flex-1">
                  {yTickHours.map((h) => (
                    <span
                      key={h}
                      className={[
                        'absolute right-0 tabular-nums leading-none text-ganshale-text',
                        h === yMaxHours
                          ? 'translate-y-0 text-[11px] font-bold'
                          : 'text-[12px] font-bold -translate-y-1/2',
                      ].join(' ')}
                      style={{ bottom: yTickBottomPct(h, yMaxHours) }}
                    >
                      {h === 0 ? '0' : `${h}h`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-2">
                <div className="gs-weekly-bar-plot relative min-h-0 flex-1 overflow-visible rounded-lg">
                  {yTickHours.filter((h) => h > 0).map((h) => (
                    <div
                      key={`grid-${h}`}
                      className="gs-weekly-bar-plot__grid pointer-events-none absolute inset-x-4 border-t"
                      style={{ bottom: yTickBottomPct(h, yMaxHours) }}
                      aria-hidden
                    />
                  ))}

                  <div className="absolute inset-x-2 bottom-0 top-0 flex items-end justify-center overflow-visible sm:inset-x-4">
                    <div
                      className="relative overflow-visible"
                      style={{
                        width: LARGE_BAR_W,
                        height: barSec > 0 ? `${barPct}%` : undefined,
                      }}
                    >
                      {labelSec > 0 ? (
                        <span className="pointer-events-none absolute bottom-full left-1/2 mb-[3px] -translate-x-1/2 whitespace-nowrap text-center text-[12px] font-semibold tabular-nums leading-none text-ganshale-accent">
                          {formatBarDurationZh(labelSec)}
                        </span>
                      ) : null}
                      <div
                        className="h-full w-full overflow-hidden shadow-[0_2px_8px_rgb(0_0_0_/_0.12)]"
                        role="img"
                        aria-label={`${detail.weekday} 工作时长 ${formatBarDurationZh(labelSec)}`}
                      >
                        {detail.segments.length > 0 ? (
                          <div className="flex h-full w-full flex-col justify-end">
                            {detail.segments.map((seg) => {
                              const pct = barSec > 0 ? (seg.seconds / barSec) * 100 : 0
                              return (
                                <div
                                  key={seg.id}
                                  className={[
                                    'w-full shrink-0',
                                    isUncategorizedCategoryId(seg.id)
                                      ? 'gs-chart-segment--uncategorized'
                                      : '',
                                  ].join(' ')}
                                  style={{
                                    height: `${pct}%`,
                                    minHeight: pct > 0 ? 6 : 0,
                                    ...(isUncategorizedCategoryId(seg.id)
                                      ? {}
                                      : { backgroundColor: seg.color }),
                                  }}
                                  title={`${seg.label} ${formatDurationPreciseSec(seg.seconds)}`}
                                />
                              )
                            })}
                          </div>
                        ) : barSec > 0 ? (
                          <div className="gs-chart-segment--uncategorized h-full w-full" />
                        ) : null}
                      </div>

                      {segmentLabels.map((seg) =>
                        seg.heightPct >= 5 ? (
                          <span
                            key={`lbl-${seg.id}`}
                            className="pointer-events-none absolute left-[calc(100%+8px)] max-w-[10rem] -translate-y-1/2 whitespace-nowrap text-[10px] leading-tight tabular-nums"
                            style={{ bottom: `${seg.midBottomPct}%` }}
                          >
                            <span className="font-medium" style={{ color: seg.color }}>
                              {seg.label}
                            </span>
                            <span className="ml-1 text-ganshale-subtle">
                              {formatBarDurationZh(seg.seconds)}
                            </span>
                          </span>
                        ) : null,
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-center text-[13px] font-bold text-ganshale-text">
                  {detail.weekday}
                  <span className="ml-1.5 font-mono text-[11px] font-semibold text-ganshale-muted">
                    {detail.md}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 min-w-0 border-t border-ganshale-border pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <h4 className="text-[11px] font-semibold text-ganshale-text">分类明细</h4>
            {detail.categories.length === 0 ? (
              <p className="mt-3 text-center text-[11px] text-ganshale-muted sm:mt-8">
                暂无分类数据
              </p>
            ) : (
              <ul className="mt-2 max-h-[min(52vh,28rem)] space-y-3 overflow-y-auto pr-0.5 [scrollbar-gutter:stable]">
                {detail.categories.map((cat) => {
                  const pct =
                    categoryTotalSec > 0
                      ? Math.round((cat.seconds / categoryTotalSec) * 100)
                      : 0
                  return (
                    <li key={cat.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-ganshale-text">
                          <span
                            className={[
                              'h-2.5 w-2.5 shrink-0 rounded-sm',
                              isUncategorizedCategoryId(cat.id)
                                ? 'gs-chart-legend-swatch--uncategorized'
                                : '',
                            ].join(' ')}
                            style={
                              isUncategorizedCategoryId(cat.id)
                                ? undefined
                                : { backgroundColor: cat.color }
                            }
                            aria-hidden
                          />
                          <span className="truncate">{cat.label}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-[11px] text-ganshale-subtle">
                          {formatDurationPreciseSec(cat.seconds)}
                          {pct > 0 ? (
                            <span className="ml-1 text-ganshale-muted">({pct}%)</span>
                          ) : null}
                        </span>
                      </div>
                      {cat.apps.length > 0 ? (
                        <ul className="mt-1.5 space-y-1 border-l-2 border-ganshale-border/80 pl-2.5">
                          {cat.apps.map((app) => (
                            <li
                              key={app.exe}
                              className="flex items-center justify-between gap-2 text-[10px] leading-snug"
                            >
                              <span className="min-w-0 truncate font-mono text-ganshale-text">
                                {app.exe}
                              </span>
                              <span className="shrink-0 tabular-nums text-ganshale-muted">
                                {formatDurationCompactSec(app.seconds)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardModalRoot>
  )
}
