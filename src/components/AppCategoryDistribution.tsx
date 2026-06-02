import { BarChart3, PieChart, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import { useDashboardClockMs } from '../hooks/useDashboardClock'
import {
  aggregateByAppCategories,
  aggregateByAppCategoriesForWeek,
} from '../lib/appCategoryAggregate'
import {
  APP_CATEGORY_CONFIG_CHANGED_EVENT,
  applyCategorySave,
  createEmptyCategory,
  loadAppCategoryConfig,
  resetCategoryInList,
  saveAppCategoryConfig,
  type AppCategoryDef,
} from '../lib/appCategoryConfig'
import { buildCategoryChartItems } from '../lib/appCategoryChartItems'
import { appTotalsForDay, appTotalsForWeek, currentForegroundSegmentLive, formatDuration } from '../lib/aggregations'
import type { AwEvent } from '../lib/awTypes'
import { compareLocalCalendarDay, compareLocalCalendarWeek, isSameLocalCalendarDay } from '../lib/timeutil'
import { CategoryDetailModal } from './CategoryDetailModal'
import { DashboardModalRoot } from './DashboardModalRoot'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  DASHBOARD_HEADER_ACTIONS_ROW_CLASS,
  DASHBOARD_TOP_CATEGORY_CHART_BODY_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'

type CategoryChartMode = 'pie' | 'bar'

const PIE_OTHER_ID = '__pie_other__'
const PREVIEW_LEGEND_MAX = 5

const PIE_INNER_RATIO = 0.52
const PIE_DISPLAY_SCALE = 1.2

function piePreset(
  base: {
    cx: number
    cy: number
    r: number
    vbX: number
    vbY: number
    vbW: number
    vbH: number
    width: number
    height: number
    cssMaxW: number
    cssMaxH: number
  },
) {
  const s = PIE_DISPLAY_SCALE
  return {
    cx: base.cx * s,
    cy: base.cy * s,
    r: base.r * s,
    innerRatio: PIE_INNER_RATIO,
    viewBox: `${base.vbX * s} ${base.vbY * s} ${base.vbW * s} ${base.vbH * s}`,
    width: Math.round(base.width * s),
    height: Math.round(base.height * s),
    svgClass: `h-[min(${Math.round(base.cssMaxH * s)}px,42vh)] w-full max-w-[${Math.round(base.cssMaxW * s)}px] shrink-0 overflow-visible`,
  }
}

const PIE_PRESETS = {
  compact: piePreset({
    cx: 72,
    cy: 72,
    r: 52,
    vbX: 0,
    vbY: 0,
    vbW: 144,
    vbH: 144,
    width: 144,
    height: 144,
    cssMaxW: 144,
    cssMaxH: 110,
  }),
  large: piePreset({
    cx: 100,
    cy: 100,
    r: 72,
    vbX: 0,
    vbY: 0,
    vbW: 200,
    vbH: 200,
    width: 280,
    height: 200,
    cssMaxW: 280,
    cssMaxH: 200,
  }),
} as const

type PieSlice = {
  id: string
  label: string
  seconds: number
  color: string
  pct: number
  startAngle: number
  endAngle: number
  labelAngle: number
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  start: number,
  end: number,
): string {
  const span = end - start
  if (span <= 0) return ''
  if (span >= 359.99) {
    return [
      `M ${cx} ${cy - rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx - 0.01} ${cy - rOuter}`,
      `L ${cx - 0.01} ${cy - rInner}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner}`,
      'Z',
    ].join(' ')
  }
  const p0o = polar(cx, cy, rOuter, start)
  const p1o = polar(cx, cy, rOuter, end)
  const p1i = polar(cx, cy, rInner, end)
  const p0i = polar(cx, cy, rInner, start)
  const largeArc = span > 180 ? 1 : 0
  return [
    `M ${p0o.x} ${p0o.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p1o.x} ${p1o.y}`,
    `L ${p1i.x} ${p1i.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p0i.x} ${p0i.y}`,
    'Z',
  ].join(' ')
}

function CategoryPieChart({
  slices,
  preset,
  hoverId,
  onHoverId,
  onSliceClick,
}: {
  slices: PieSlice[]
  preset: keyof typeof PIE_PRESETS
  hoverId: string | null
  onHoverId: (id: string | null) => void
  onSliceClick: (id: string) => void
}) {
  const { cx, cy, r, innerRatio, viewBox, width, height, svgClass } = PIE_PRESETS[preset]
  const rOuter = r
  const rInner = r * innerRatio

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={[svgClass, 'cursor-pointer'].join(' ')}
      role="img"
      aria-label="应用分类占比环形图"
      onClick={() => onSliceClick('')}
    >
      {slices.map((s) => {
        const sweep = s.endAngle - s.startAngle
        if (sweep < 0.05) return null
        const d = donutSlicePath(cx, cy, rOuter, rInner, s.startAngle, s.endAngle)
        if (!d) return null
        const active = hoverId === s.id
        const isFullRing = slices.filter((x) => x.endAngle - x.startAngle >= 0.05).length === 1
        return (
          <path
            key={s.id}
            d={d}
            fill={s.color}
            stroke={isFullRing ? 'none' : '#ffffff'}
            strokeWidth={isFullRing ? 0 : active ? 2.5 : 2}
            strokeLinejoin="round"
            className="cursor-pointer transition-opacity"
            style={{ opacity: hoverId && !active ? 0.6 : 1 }}
            onMouseEnter={() => onHoverId(s.id)}
            onMouseLeave={() => onHoverId(null)}
            onClick={(e) => {
              e.stopPropagation()
              onSliceClick(s.id)
            }}
          >
            <title>
              {s.label}: {s.pct}% ({formatDuration(s.seconds)})
            </title>
          </path>
        )
      })}
    </svg>
  )
}

const Y_AXIS_TICKS = [100, 50, 0] as const

/** 分类占比柱状图：纵向柱 + 横纵坐标，占比标在柱顶上方 */
function CategoryBarChart({
  slices,
  hoverId,
  onHoverId,
  onBarClick,
  onLabelClick,
  compact,
}: {
  slices: PieSlice[]
  hoverId: string | null
  onHoverId: (id: string | null) => void
  /** 点击柱体区域 → 查看大图 */
  onBarClick?: () => void
  /** 点击横轴分类名 → 编辑分类 */
  onLabelClick: (id: string) => void
  compact?: boolean
}) {
  const ordered = useMemo(
    () => [...slices].sort((a, b) => b.seconds - a.seconds || a.label.localeCompare(b.label, 'zh')),
    [slices],
  )
  const maxSeconds = useMemo(
    () => ordered.reduce((m, s) => Math.max(m, s.seconds), 0),
    [ordered],
  )
  /** 柱顶占比预留高度，避免最高柱的 % 被裁切 */
  const pctReserve = compact ? 18 : 22
  const plotInnerH = compact ? 96 : 168
  const plotTotalH = plotInnerH + pctReserve
  const xLabelH = compact ? 34 : 43
  const pctAboveBarPx = compact ? 2 : 3
  const yAxisW = compact ? 30 : 36
  const tickFs = compact ? 'text-[10px]' : 'text-[11px]'
  const pctFs = compact ? 'text-[11px]' : 'text-[12px]'
  const nameFs = compact ? 'text-[10px]' : 'text-[11px]'

  const columnStyle = {
    maxWidth: compact ? '2.75rem' : '4rem',
    minWidth: compact ? '1.75rem' : '2.25rem',
  } as const

  return (
    <div
      className={[
        'flex w-full overflow-x-auto',
        compact ? 'w-full max-h-full -ml-2 pl-0.5 pr-0.5' : '-ml-4 pb-0.5',
      ].join(' ')}
      role="img"
      aria-label="应用分类占比柱状图"
    >
      {/* 纵轴刻度；纵线仅从 0% 绘图区起 */}
      <div className="flex shrink-0 flex-col" style={{ width: yAxisW }}>
        <div style={{ height: pctReserve }} aria-hidden />
        <div className="relative shrink-0" style={{ height: plotInnerH }}>
          {Y_AXIS_TICKS.map((tick) => (
            <span
              key={tick}
              className={[
                'absolute right-0 -translate-y-1/2 tabular-nums leading-none text-ganshale-muted',
                tickFs,
              ].join(' ')}
              style={{ bottom: `${(tick / 100) * plotInnerH}px` }}
            >
              {tick}%
            </span>
          ))}
        </div>
        <div style={{ height: xLabelH }} aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 上方留白给占比；柱体区与纵轴 0% 基线对齐 */}
        <div
          className={[
            'relative shrink-0 overflow-visible',
            onBarClick ? 'cursor-pointer' : '',
          ].join(' ')}
          style={{ height: plotTotalH }}
          onClick={() => onBarClick?.()}
          role={onBarClick ? 'presentation' : undefined}
        >
          <div style={{ height: pctReserve }} aria-hidden />
          <div
            className="gs-category-bar-plot relative overflow-visible border-b border-l"
            style={{ height: plotInnerH }}
          >
            <div
              className="gs-category-bar-plot__grid pointer-events-none absolute inset-x-0 border-t border-dashed"
              style={{ bottom: '50%' }}
              aria-hidden
            />
            <div className="flex h-full items-end justify-around gap-0.5 px-1">
            {ordered.map((s) => {
              const active = hoverId === s.id
              const pctH = maxSeconds > 0 ? (s.seconds / maxSeconds) * 100 : 0
              const barH = Math.max(3, Math.round((plotInnerH * pctH) / 100))
              return (
                <button
                  key={s.id}
                  type="button"
                  className={[
                    'relative flex h-full max-w-[3.25rem] flex-1 items-end justify-center rounded-sm transition',
                    compact ? 'min-w-[1.75rem]' : 'min-w-[2.25rem]',
                    active ? 'gs-category-bar-hover' : 'gs-category-bar-hover hover:opacity-100',
                  ].join(' ')}
                  style={columnStyle}
                  onMouseEnter={() => onHoverId(s.id)}
                  onMouseLeave={() => onHoverId(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onBarClick?.()
                  }}
                  title={`${s.label}: ${s.pct}%`}
                >
                  <span
                    className={[
                      'pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap tabular-nums leading-none text-ganshale-text',
                      pctFs,
                    ].join(' ')}
                    style={{ bottom: barH + pctAboveBarPx }}
                  >
                    {s.pct}%
                  </span>
                  <div
                    className="w-[68%] max-w-[1.25rem] shrink-0 rounded-t-[2px] transition-[height]"
                    style={{
                      height: barH,
                      backgroundColor: s.color,
                      opacity: hoverId && !active ? 0.55 : 1,
                    }}
                  />
                </button>
              )
            })}
            </div>
          </div>
        </div>

        {/* 横轴：分类名 */}
        <div
          className="flex items-start justify-around gap-0.5 px-0.5 pt-1"
          style={{ minHeight: xLabelH }}
        >
          {ordered.map((s) => (
            <button
              key={`x-${s.id}`}
              type="button"
              className={[
                'line-clamp-2 min-w-0 flex-1 max-w-[3.25rem] cursor-pointer text-center font-medium leading-tight text-ganshale-text transition hover:text-ganshale-accent hover:underline',
                nameFs,
                s.id === PIE_OTHER_ID ? 'pointer-events-none cursor-default hover:no-underline' : '',
              ].join(' ')}
              style={{ maxWidth: compact ? '2.75rem' : '4rem' }}
              title={s.id === PIE_OTHER_ID ? s.label : `${s.label}（点击编辑）`}
              onClick={() => onLabelClick(s.id)}
              onMouseEnter={() => onHoverId(s.id)}
              onMouseLeave={() => onHoverId(null)}
              disabled={s.id === PIE_OTHER_ID}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryChartModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CategoryChartMode
  onChange: (m: CategoryChartMode) => void
  disabled?: boolean
}) {
  const btn = (m: CategoryChartMode, label: string, Icon: typeof PieChart) => (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={mode === m}
      onClick={() => onChange(m)}
      className={[
        'gs-chart-mode-btn',
        mode === m ? 'gs-chart-mode-btn--active' : '',
      ].join(' ')}
    >
      <Icon className="h-3 w-3" strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  )
  return (
    <div className="gs-chart-mode-group" role="group" aria-label="图表类型">
      {btn('pie', '饼图', PieChart)}
      {btn('bar', '柱状', BarChart3)}
    </div>
  )
}

/** 图例：侧边纵向排列，或大图弹层内横向换行 */
function CategoryPieLegend({
  slices,
  hoverId,
  onHoverId,
  onLabelClick,
  large,
  vertical = false,
}: {
  slices: PieSlice[]
  hoverId: string | null
  onHoverId: (id: string | null) => void
  /** 点击图例分类名 → 编辑分类 */
  onLabelClick: (id: string) => void
  large?: boolean
  vertical?: boolean
}) {
  const ordered = slices

  const legendLine = (s: PieSlice) =>
    large
      ? `${s.label}: ${s.pct}% (${formatDuration(s.seconds)})`
      : `${s.label}: ${s.pct}%`

  return (
    <ul
      className={[
        vertical
          ? large
            ? 'flex shrink-0 flex-col items-start justify-center gap-y-1.5 overflow-y-auto py-0.5'
            : 'flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-y-1 overflow-y-auto py-0.5 pr-0.5'
          : 'flex w-full flex-row flex-wrap content-start justify-center gap-x-2.5 gap-y-1.5 px-1',
        large && !vertical ? 'gap-x-4 gap-y-2 px-2' : '',
      ].join(' ')}
      aria-label="应用分类图例"
    >
      {ordered.map((s) => (
        <li key={s.id} className={vertical ? 'min-w-0 w-full' : 'shrink-0'}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onLabelClick(s.id)
            }}
            onMouseEnter={() => onHoverId(s.id)}
            onMouseLeave={() => onHoverId(null)}
            className={[
              'flex w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 text-left transition',
              large ? 'py-1' : 'py-0.5',
              s.id === PIE_OTHER_ID ? 'cursor-default' : '',
              hoverId === s.id
                ? 'border-ganshale-border bg-ganshale-page'
                : 'border-transparent hover:border-ganshale-border hover:bg-ganshale-page/80',
            ].join(' ')}
          >
            <span
              className={['shrink-0 rounded-full', large ? 'h-2.5 w-2.5' : 'h-2 w-2'].join(' ')}
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span
              className={[
                'min-w-0 font-medium tabular-nums',
                vertical && !large ? 'truncate' : 'whitespace-nowrap',
                vertical ? (large ? 'text-[11px]' : 'text-[10px]') : large ? 'text-sm' : 'text-[11px]',
              ].join(' ')}
              style={{ color: s.color }}
              title={legendLine(s)}
            >
              {legendLine(s)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function foldCategoryItemsForPreview(
  items: { id: string; label: string; seconds: number; color: string }[],
  maxVisible: number,
): { id: string; label: string; seconds: number; color: string }[] {
  if (items.length <= maxVisible) return items

  const visible = items.slice(0, maxVisible)
  const rest = items.slice(maxVisible)
  const otherSeconds = rest.reduce((sum, item) => sum + item.seconds, 0)
  return [
    ...visible,
    {
      id: PIE_OTHER_ID,
      label: `…（+${rest.length}）`,
      seconds: otherSeconds,
      color: '#94a3b8',
    },
  ]
}

function buildPieSlices(
  items: { id: string; label: string; seconds: number; color: string }[],
  total: number,
  forChart = false,
): PieSlice[] {
  const chartItems = forChart && total > 0 ? items.filter((i) => i.seconds > 0) : items
  const n = chartItems.length
  let angle = 0
  return chartItems.map((item) => {
    const share = total > 0 ? item.seconds / total : 0
    const sweep = total > 0 ? share * 360 : n > 0 ? 360 / n : 0
    const endAngle = angle + sweep
    const slice: PieSlice = {
      ...item,
      pct: pct(item.seconds, total),
      startAngle: angle,
      endAngle: forChart && n === 1 && total > 0 ? 360 : endAngle,
      labelAngle: angle + sweep / 2,
    }
    angle = endAngle
    return slice
  })
}

export function AppCategoryDistribution({
  day,
  events,
  ready,
  weekStartMonday,
}: {
  day: Date
  events: AwEvent[]
  ready: boolean
  /** 传入则按整周聚合，并沿用周次未来/本周判断 */
  weekStartMonday?: Date
}) {
  const [categories, setCategories] = useState<AppCategoryDef[]>(() => loadAppCategoryConfig())

  useEffect(() => {
    const sync = () => setCategories(loadAppCategoryConfig())
    window.addEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, sync)
    return () => window.removeEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, sync)
  }, [])
  const [detailModalId, setDetailModalId] = useState<string | null>(null)
  const [pendingNewCategory, setPendingNewCategory] = useState<AppCategoryDef | null>(null)
  const [chartModalOpen, setChartModalOpen] = useState(false)
  const [chartMode, setChartMode] = useState<CategoryChartMode>('pie')
  const [modalChartMode, setModalChartMode] = useState<CategoryChartMode>('pie')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [chartHoverId, setChartHoverId] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)
  const { liveForeground } = useGanshaleData()
  const clockMs = useDashboardClockMs()
  const weekMode = weekStartMonday != null
  const selectedDayKind = useMemo(
    () =>
      weekMode
        ? compareLocalCalendarWeek(weekStartMonday!)
        : compareLocalCalendarDay(day),
    [weekMode, weekStartMonday, day],
  )
  const isFutureDay = weekMode ? selectedDayKind === 'future' : selectedDayKind === 'future'

  const { workdayTimerPausedByUser } = useGanshaleData()
  useEffect(() => {
    if (workdayTimerPausedByUser) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [workdayTimerPausedByUser])

  const eventsForAgg = useMemo(() => {
    void liveTick
    const today = isSameLocalCalendarDay(day, new Date())
    if (!today) return events
    const { event, seconds } = currentForegroundSegmentLive(
      events,
      liveForeground,
      clockMs,
      true,
    )
    if (!event) return events
    return events.map((ev) => (ev.id === event.id ? { ...ev, duration: seconds } : ev))
  }, [day, events, liveForeground, clockMs, liveTick])

  const { buckets } = useMemo(
    () =>
      weekMode
        ? aggregateByAppCategoriesForWeek(weekStartMonday!, eventsForAgg, categories)
        : aggregateByAppCategories(day, eventsForAgg, categories),
    [weekMode, weekStartMonday, day, eventsForAgg, categories],
  )

  const appPathByExe = useMemo(() => {
    const m = new Map<string, string>()
    for (const ev of events) {
      const app = String(ev.data.app ?? 'unknown')
      if (!m.has(app)) {
        const p = String(ev.data.appPath ?? '').trim()
        if (p) m.set(app, p)
      }
    }
    return m
  }, [events])

  const durationApps = useMemo(
    () =>
      weekMode
        ? appTotalsForWeek(weekStartMonday!, eventsForAgg)
        : appTotalsForDay(day, eventsForAgg),
    [weekMode, weekStartMonday, day, eventsForAgg],
  )

  const pieItemsAll = useMemo(
    () => buildCategoryChartItems(categories, buckets),
    [categories, buckets],
  )

  const pieItemsPreview = useMemo(
    () => foldCategoryItemsForPreview(pieItemsAll, PREVIEW_LEGEND_MAX),
    [pieItemsAll],
  )

  const displayTotalSeconds = useMemo(
    () => pieItemsAll.reduce((sum, item) => sum + item.seconds, 0),
    [pieItemsAll],
  )

  const legendSlicesPreview = useMemo(
    () => buildPieSlices(pieItemsPreview, displayTotalSeconds, false),
    [pieItemsPreview, displayTotalSeconds],
  )
  const chartSlicesPreview = useMemo(
    () => buildPieSlices(pieItemsPreview, displayTotalSeconds, true),
    [pieItemsPreview, displayTotalSeconds],
  )
  const legendSlicesAll = useMemo(
    () => buildPieSlices(pieItemsAll, displayTotalSeconds, false),
    [pieItemsAll, displayTotalSeconds],
  )
  const chartSlicesAll = useMemo(
    () => buildPieSlices(pieItemsAll, displayTotalSeconds, true),
    [pieItemsAll, displayTotalSeconds],
  )

  const detailCategory = useMemo((): AppCategoryDef | undefined => {
    if (!detailModalId) return undefined
    if (pendingNewCategory?.id === detailModalId) return pendingNewCategory
    return categories.find((c) => c.id === detailModalId)
  }, [detailModalId, categories, pendingNewCategory])

  const closeDetailModal = useCallback(() => {
    setDetailModalId(null)
    setPendingNewCategory(null)
  }, [])
  const modalBucket = detailModalId
    ? (buckets[detailModalId] ?? { seconds: 0, apps: {} })
    : undefined

  const onSaveCategory = useCallback((id: string, name: string, keywords: string[]) => {
    setCategories((prev) => {
      const base =
        pendingNewCategory?.id === id && !prev.some((c) => c.id === id)
          ? [...prev, pendingNewCategory]
          : prev
      const next = applyCategorySave(base, id, name, keywords)
      saveAppCategoryConfig(next)
      return next
    })
    setPendingNewCategory(null)
  }, [pendingNewCategory])

  const onDeleteCategory = useCallback((id: string) => {
    if (pendingNewCategory?.id === id) {
      closeDetailModal()
      return
    }
    setCategories((prev) => {
      const next = resetCategoryInList(prev, id)
      saveAppCategoryConfig(next)
      return next
    })
  }, [pendingNewCategory, closeDetailModal])

  const openSliceDetail = useCallback((id: string) => {
    if (id === PIE_OTHER_ID) return
    setChartModalOpen(false)
    setDetailModalId(id)
  }, [])

  const openChartModal = useCallback(() => {
    setModalChartMode(chartMode)
    setChartModalOpen(true)
  }, [chartMode])

  const openAddCategory = useCallback(() => {
    const row = createEmptyCategory()
    setPendingNewCategory(row)
    setChartModalOpen(false)
    setDetailModalId(row.id)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden p-2 sm:p-2.5">
      <div className="flex h-[22px] min-h-[22px] shrink-0 items-start justify-between gap-2">
        <DashboardSectionTitle
          icon={PieChart}
          description={DASHBOARD_SECTION_DESCRIPTIONS.dailyCategoryDistribution}
        >
          应用分类分布
        </DashboardSectionTitle>
        {!isFutureDay ? (
          <div className={DASHBOARD_HEADER_ACTIONS_ROW_CLASS}>
            <button
              type="button"
              onClick={openAddCategory}
              disabled={!ready}
              className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
            >
              添加类
            </button>
            <CategoryChartModeToggle
              mode={chartMode}
              onChange={setChartMode}
              disabled={!ready}
            />
          </div>
        ) : null}
      </div>

      <div
        className={
          chartMode === 'bar'
            ? 'flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-visible'
            : DASHBOARD_TOP_CATEGORY_CHART_BODY_CLASS
        }
      >
        {!ready ? (
          <p className="flex h-full w-full items-center justify-center text-center text-xs text-ganshale-muted">
            加载中…
          </p>
        ) : (
          <div
            className={[
              'flex h-full min-h-0 w-full flex-1 flex-col rounded-md',
              chartMode === 'bar'
                ? 'items-center justify-end overflow-visible pb-px pl-0.5 pt-0'
                : 'items-center justify-center overflow-hidden py-0.5 pl-2 sm:flex-row sm:items-center sm:gap-2 sm:pl-3',
            ].join(' ')}
          >
            {chartMode === 'pie' ? (
              <>
                <div className="flex shrink-0 items-center justify-center">
                  <CategoryPieChart
                    slices={chartSlicesPreview}
                    preset="compact"
                    hoverId={hoverId}
                    onHoverId={setHoverId}
                    onSliceClick={() => openChartModal()}
                  />
                </div>
                <CategoryPieLegend
                  slices={legendSlicesPreview}
                  hoverId={hoverId}
                  onHoverId={setHoverId}
                  onLabelClick={(id) =>
                    id === PIE_OTHER_ID ? openChartModal() : openSliceDetail(id)
                  }
                  vertical
                />
              </>
            ) : (
              <CategoryBarChart
                  slices={legendSlicesPreview}
                  hoverId={hoverId}
                  onHoverId={setHoverId}
                  onBarClick={openChartModal}
                  onLabelClick={(id) =>
                    id === PIE_OTHER_ID ? openChartModal() : openSliceDetail(id)
                  }
                compact
              />
            )}
          </div>
        )}
      </div>

      {chartModalOpen && ready ? (
        <DashboardModalRoot
          open
          onClose={() => setChartModalOpen(false)}
          labelledBy="category-pie-modal-title"
          dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
        >
            <div
              className={`flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
            >
              <DashboardSectionTitle id="category-pie-modal-title" icon={PieChart}>
                应用分类分布
              </DashboardSectionTitle>
              <div className="flex items-center gap-1.5">
                <CategoryChartModeToggle mode={modalChartMode} onChange={setModalChartMode} />
                <button
                  type="button"
                  onClick={() => setChartModalOpen(false)}
                  className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>
            <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
              {modalChartMode === 'pie' ? (
                <div className="flex min-h-0 w-full flex-col items-center gap-4 py-4">
                  <div className="flex shrink-0 items-center justify-center">
                    <CategoryPieChart
                      slices={chartSlicesAll}
                      preset="large"
                      hoverId={chartHoverId}
                      onHoverId={setChartHoverId}
                      onSliceClick={() => {}}
                    />
                  </div>
                  <CategoryPieLegend
                    slices={legendSlicesAll}
                    hoverId={chartHoverId}
                    onHoverId={setChartHoverId}
                    onLabelClick={openSliceDetail}
                    large
                  />
                </div>
              ) : (
                <CategoryBarChart
                  slices={legendSlicesAll}
                  hoverId={chartHoverId}
                  onHoverId={setChartHoverId}
                  onLabelClick={openSliceDetail}
                />
              )}
            </div>
        </DashboardModalRoot>
      ) : null}

      {detailModalId && detailCategory && modalBucket ? (
        <CategoryDetailModal
          key={detailModalId}
          category={detailCategory}
          categories={categories}
          bucket={modalBucket}
          durationApps={durationApps}
          appPathByExe={appPathByExe}
          isNewDraft={pendingNewCategory?.id === detailModalId}
          onClose={closeDetailModal}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : null}
    </div>
  )
}
