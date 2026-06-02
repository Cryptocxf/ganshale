import { useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { aggregateByAppCategories } from '../lib/appCategoryAggregate'
import {
  APP_CATEGORY_CONFIG_CHANGED_EVENT,
  loadAppCategoryConfig,
  UNCATEGORIZED_ID,
  type AppCategoryDef,
} from '../lib/appCategoryConfig'
import { useAppCategoryConfigRevision } from '../hooks/useAppCategoryConfigRevision'
import {
  buildCategoryLegendTemplate,
  buildCategoryStackSegments,
  type CategoryChartLegendItem,
} from '../lib/appCategoryChartItems'
import { isUncategorizedCategoryId, UNCATEGORIZED_BAR } from '../lib/categoryBarColors'
import { currentForegroundSegmentLive } from '../lib/aggregations'
import { useGanshaleData } from '../context/useGanshaleData'
import { barHeightPct, buildYTickHours, ceilYMaxHours, yTickBottomPct } from '../lib/weeklyDayBarChart'
import { formatBarDurationZh, officeSecondsForLocalDay } from '../lib/weeklyWorktime'
import {
  compareLocalCalendarWeek,
  daysInLocalWeek,
  isSameLocalCalendarDay,
  toYmdLocal,
} from '../lib/timeutil'
import type { AwEvent } from '../lib/awTypes'
import type { LiveForegroundSample } from '../lib/liveForeground'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  WeeklyDayDurationDetailModal,
  type WeeklyDayDurationDetail,
} from './WeeklyDayDurationDetailModal'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const
const Y_AXIS_W = 38

function formatMdLabel(ymd: string): string {
  const [, m, d] = ymd.split('-')
  return `${m}-${d}`
}

type DayStack = {
  key: string
  day: Date
  weekday: string
  md: string
  totalSec: number
  segments: { id: string; label: string; seconds: number; color: string }[]
  categories: WeeklyDayDurationDetail['categories']
}

function segmentHeightInBarPct(
  segSeconds: number,
  barSec: number,
  stackSec: number,
): number {
  if (barSec <= 0 || segSeconds <= 0) return 0
  if (stackSec > barSec) {
    return stackSec > 0 ? (segSeconds / stackSec) * 100 : 0
  }
  return (segSeconds / barSec) * 100
}

function segmentBarClass(categoryId: string): string {
  return isUncategorizedCategoryId(categoryId) ? 'gs-chart-segment--uncategorized' : ''
}

function segmentBarStyle(categoryId: string, color: string): { backgroundColor?: string } {
  if (isUncategorizedCategoryId(categoryId)) return {}
  return { backgroundColor: color }
}

function legendSwatchClass(categoryId: string): string {
  return isUncategorizedCategoryId(categoryId)
    ? 'gs-chart-legend-swatch--uncategorized'
    : ''
}

export function WeeklyDailyDurationDistribution({
  weekStart,
  events,
  patterns,
  live,
  extrapolateToday,
  ready,
}: {
  weekStart: Date
  events: AwEvent[]
  patterns: string[]
  live: LiveForegroundSample | null
  extrapolateToday: boolean
  ready: boolean
}) {
  const weekKind = compareLocalCalendarWeek(weekStart)
  const { getWorkdayPausedMs } = useGanshaleData()
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const categoryRev = useAppCategoryConfigRevision()
  const [categories, setCategories] = useState<AppCategoryDef[]>(() => loadAppCategoryConfig())

  useEffect(() => {
    const sync = () => setCategories(loadAppCategoryConfig())
    window.addEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, sync)
    return () => window.removeEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, sync)
  }, [])

  useEffect(() => {
    setCategories(loadAppCategoryConfig())
  }, [categoryRev])

  const eventsForUi = useMemo(() => {
    if (!extrapolateToday) return events
    const { event, seconds } = currentForegroundSegmentLive(events, live, Date.now(), true)
    if (!event) return events
    return events.map((ev) => (ev.id === event.id ? { ...ev, duration: seconds } : ev))
  }, [events, live, extrapolateToday])

  const dayStacks = useMemo((): DayStack[] => {
    const now = new Date()
    return daysInLocalWeek(weekStart).map((day, i) => {
      const { buckets } = aggregateByAppCategories(day, eventsForUi, categories)
      const dayItems = buildCategoryStackSegments(categories, buckets)
      const segments = dayItems.map((item) => ({
        id: item.id,
        label: item.label,
        seconds: item.seconds,
        color: item.color,
      }))

      const detailCategories = dayItems
        .map((item) => {
          const bucket = buckets[item.id]
          if (!bucket || bucket.seconds <= 0) return null
          const apps = Object.entries(bucket.apps)
            .map(([exe, sec]) => ({ exe, seconds: Math.round(sec) }))
            .filter((a) => a.seconds > 0)
            .sort((a, b) => b.seconds - a.seconds)
          return {
            id: item.id,
            label: item.label,
            color: item.color,
            seconds: item.seconds,
            apps,
          }
        })
        .filter((c): c is NonNullable<typeof c> => c != null)
        .sort((a, b) => b.seconds - a.seconds)

      const totalSec = officeSecondsForLocalDay(
        day,
        eventsForUi,
        patterns,
        live,
        now,
        extrapolateToday && isSameLocalCalendarDay(day, now),
        extrapolateToday && isSameLocalCalendarDay(day, now)
          ? getWorkdayPausedMs(now.getTime())
          : 0,
      )

      return {
        key: toYmdLocal(day),
        day,
        weekday: WEEKDAY_LABELS[i] ?? '—',
        md: formatMdLabel(toYmdLocal(day)),
        totalSec,
        segments,
        categories: detailCategories,
      }
    })
  }, [weekStart, eventsForUi, categories, patterns, live, extrapolateToday, getWorkdayPausedMs])

  const categoryLegendTemplate = useMemo(
    () => buildCategoryLegendTemplate(categories),
    [categories],
  )

  const peakKey = useMemo(() => {
    let best = dayStacks[0]?.key ?? ''
    let max = -1
    for (const d of dayStacks) {
      if (d.totalSec > max) {
        max = d.totalSec
        best = d.key
      }
    }
    return best
  }, [dayStacks])

  const activeLegend = useMemo((): CategoryChartLegendItem[] => {
    const ids = new Set<string>()
    for (const d of dayStacks) {
      for (const seg of d.segments) ids.add(seg.id)
    }
    const out = categoryLegendTemplate.filter((item) => ids.has(item.id))
    if (ids.has(UNCATEGORIZED_ID)) {
      out.push({ id: UNCATEGORIZED_ID, label: '其他', color: UNCATEGORIZED_BAR })
    }
    return out
  }, [dayStacks, categoryLegendTemplate])

  const yMaxHours = useMemo(() => {
    let maxSec = 0
    for (const row of dayStacks) {
      maxSec = Math.max(maxSec, row.totalSec)
    }
    return ceilYMaxHours(maxSec)
  }, [dayStacks])

  const yMaxSec = yMaxHours * 3600
  const yTickHours = useMemo(() => buildYTickHours(yMaxHours), [yMaxHours])

  const selectedDetail = useMemo((): WeeklyDayDurationDetail | null => {
    if (!selectedDayKey) return null
    const row = dayStacks.find((d) => d.key === selectedDayKey)
    if (!row) return null
    return {
      key: row.key,
      weekday: row.weekday,
      md: row.md,
      totalSec: row.totalSec,
      segments: row.segments,
      categories: row.categories,
    }
  }, [selectedDayKey, dayStacks])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 pr-2">
          <DashboardSectionTitle
            icon={BarChart3}
            description={DASHBOARD_SECTION_DESCRIPTIONS.weeklyDailyDurationDistribution}
          >
            每日工作时长分布
          </DashboardSectionTitle>
          <DashboardSectionSubtitle>
            {weekKind === 'future'
              ? '该周尚未开始'
              : '周一至周日 · 按分类堆叠 · 图例为分类名称'}
          </DashboardSectionSubtitle>
        </div>
        {ready && weekKind !== 'future' && activeLegend.length > 0 ? (
          <div className="flex max-w-[min(100%,22rem)] flex-wrap items-center justify-end gap-1.5">
            {activeLegend.map((item) => (
              <span
                key={item.id}
                className="gs-popover-surface inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] text-ganshale-muted"
              >
                <span
                  className={[
                    'h-2 w-2 shrink-0 rounded-sm',
                    legendSwatchClass(item.id),
                  ].join(' ')}
                  style={
                    isUncategorizedCategoryId(item.id)
                      ? undefined
                      : { backgroundColor: item.color }
                  }
                  aria-hidden
                />
                <span className="font-medium" style={{ color: item.color }}>
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!ready ? (
          <p className="flex flex-1 items-center justify-center text-xs text-ganshale-muted">
            加载中…
          </p>
        ) : weekKind === 'future' ? (
          <p className="flex flex-1 items-center justify-center text-xs text-ganshale-muted">
            暂无数据
          </p>
        ) : categories.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-xs text-ganshale-muted">
            请先在「每日」页添加应用分类
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 gap-2">
              <div
                className="flex shrink-0 flex-col pt-4"
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
                          ? 'translate-y-0 text-[10px] font-bold'
                          : 'text-[11px] font-bold -translate-y-1/2',
                      ].join(' ')}
                      style={{ bottom: yTickBottomPct(h, yMaxHours) }}
                    >
                      {h === 0 ? '0' : `${h}h`}
                    </span>
                  ))}
                </div>
                <div className="mt-2 h-[1.875rem] shrink-0" />
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-4">
                <div className="gs-weekly-bar-plot relative min-h-0 flex-1 overflow-visible rounded-lg">
                  {yTickHours.filter((h) => h > 0).map((h) => (
                    <div
                      key={`grid-${h}`}
                      className="gs-weekly-bar-plot__grid pointer-events-none absolute inset-x-2 border-t"
                      style={{ bottom: yTickBottomPct(h, yMaxHours) }}
                      aria-hidden
                    />
                  ))}

                  <div className="absolute inset-x-1 bottom-0 top-0 flex items-end justify-around gap-0.5 px-0.5">
                    {dayStacks.map((row) => {
                      const isPeak = row.key === peakKey
                      const barSec = row.totalSec
                      const barPct = barHeightPct(barSec, yMaxSec)
                      const stackSec = row.segments.reduce((s, seg) => s + seg.seconds, 0)

                      return (
                        <div
                          key={row.key}
                          className="flex h-full min-w-0 max-w-[3.25rem] flex-1 items-end justify-center"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedDayKey(row.key)}
                            className="relative flex w-[78%] min-w-[1.25rem] max-w-[2.5rem] cursor-pointer items-end justify-center rounded-sm transition hover:bg-ganshale-page/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ganshale-accent/55"
                            style={barSec > 0 ? { height: `${barPct}%` } : undefined}
                            aria-label={`查看 ${row.weekday} ${row.md} 工作时长详情`}
                          >
                            {barSec > 0 ? (
                              <span
                                className={[
                                  'pointer-events-none absolute bottom-full left-1/2 mb-[3px] -translate-x-1/2 whitespace-nowrap text-center text-[9px] tabular-nums leading-none',
                                  isPeak
                                    ? 'font-semibold text-ganshale-accent'
                                    : 'font-medium text-ganshale-text',
                                ].join(' ')}
                                title={`${row.weekday} ${row.md}：${formatBarDurationZh(barSec)}`}
                              >
                                {formatBarDurationZh(barSec)}
                              </span>
                            ) : null}

                            <div className="h-full w-full overflow-hidden shadow-[0_1px_3px_rgb(0_0_0_/_0.1)]">
                              {row.segments.length > 0 ? (
                                <div className="flex h-full w-full flex-col justify-end">
                                  {row.segments.map((seg) => {
                                    const pct = segmentHeightInBarPct(
                                      seg.seconds,
                                      barSec,
                                      stackSec,
                                    )
                                    return (
                                      <div
                                        key={seg.id}
                                        className={[
                                          'w-full shrink-0',
                                          segmentBarClass(seg.id),
                                        ].join(' ')}
                                        style={{
                                          height: `${pct}%`,
                                          ...segmentBarStyle(seg.id, seg.color),
                                        }}
                                      />
                                    )
                                  })}
                                  {stackSec < barSec && barSec > 0 ? (
                                    <div
                                      className="gs-chart-segment--uncategorized w-full shrink-0"
                                      style={{
                                        height: `${((barSec - stackSec) / barSec) * 100}%`,
                                      }}
                                    />
                                  ) : null}
                                </div>
                              ) : barSec > 0 ? (
                                <div className="gs-chart-segment--uncategorized h-full w-full" />
                              ) : (
                                <div className="h-2 w-full bg-ganshale-border/20" />
                              )}
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-2 flex h-[1.875rem] shrink-0 items-start justify-around gap-0.5 px-0.5">
                  {dayStacks.map((row) => (
                    <div
                      key={`x-${row.key}`}
                      className="flex min-w-0 max-w-[3.25rem] flex-1 flex-col items-center leading-none"
                    >
                      <span className="text-[13px] font-bold text-ganshale-text">
                        {row.weekday}
                      </span>
                      <span className="mt-0.5 font-mono text-[10px] font-semibold text-ganshale-muted">
                        {row.md}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedDetail ? (
        <WeeklyDayDurationDetailModal
          detail={selectedDetail}
          onClose={() => setSelectedDayKey(null)}
        />
      ) : null}
    </div>
  )
}
