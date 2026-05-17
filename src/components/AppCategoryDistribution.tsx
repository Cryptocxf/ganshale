import { PieChart, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import { aggregateByAppCategories } from '../lib/appCategoryAggregate'
import {
  createEmptyCategory,
  loadAppCategoryConfig,
  saveAppCategoryConfig,
  UNCATEGORIZED_ID,
  type AppCategoryDef,
} from '../lib/appCategoryConfig'
import { pieColorForIndex, UNCATEGORIZED_BAR } from '../lib/categoryBarColors'
import { currentForegroundSegmentLive, formatDuration } from '../lib/aggregations'
import type { AwEvent } from '../lib/awTypes'
import { isSameLocalCalendarDay } from '../lib/timeutil'
import { CategoryDetailModal } from './CategoryDetailModal'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SHELL_CLASS,
} from './dashboardLayout'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'

const PIE_CHART_ACTION_BTN_CLASS =
  'shrink-0 rounded-md border border-black/[0.08] bg-white px-2 py-0.5 text-[10px] font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page'

const PIE_PREVIEW_TOP_N = 5
const PIE_OTHER_ID = '__pie_other__'
const PIE_OTHER_COLOR = UNCATEGORIZED_BAR

type PieItemBase = { id: string; label: string; seconds: number; color: string }

function pieItemsWithUsage(items: PieItemBase[]): PieItemBase[] {
  return items.filter((i) => i.seconds > 0)
}

function collapsePieItemsTopN(items: PieItemBase[], topN: number): PieItemBase[] {
  const withUsage = pieItemsWithUsage(items)
  if (withUsage.length <= topN) return withUsage
  const sorted = [...withUsage].sort((a, b) => b.seconds - a.seconds)
  const top = sorted.slice(0, topN)
  const rest = sorted.slice(topN)
  const otherSeconds = rest.reduce((sum, i) => sum + i.seconds, 0)
  if (otherSeconds > 0) {
    top.push({
      id: PIE_OTHER_ID,
      label: '其他',
      seconds: otherSeconds,
      color: PIE_OTHER_COLOR,
    })
  }
  return top
}

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
      className={svgClass}
      role="img"
      aria-label="应用分类占比环形图"
    >
      {slices.map((s) => {
        const sweep = s.endAngle - s.startAngle
        if (sweep < 0.05) return null
        const d = donutSlicePath(cx, cy, rOuter, rInner, s.startAngle, s.endAngle)
        if (!d) return null
        const active = hoverId === s.id
        return (
          <path
            key={s.id}
            d={d}
            fill={s.color}
            stroke="#ffffff"
            strokeWidth={active ? 2.5 : 2}
            strokeLinejoin="round"
            className="cursor-pointer transition-opacity"
            style={{ opacity: hoverId && !active ? 0.6 : 1 }}
            onMouseEnter={() => onHoverId(s.id)}
            onMouseLeave={() => onHoverId(null)}
            onClick={() => onSliceClick(s.id)}
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

/** 图例：侧边纵向排列，或大图弹层内横向换行 */
function CategoryPieLegend({
  slices,
  hoverId,
  onHoverId,
  onSelect,
  large,
  vertical = false,
}: {
  slices: PieSlice[]
  hoverId: string | null
  onHoverId: (id: string | null) => void
  onSelect: (id: string) => void
  large?: boolean
  vertical?: boolean
}) {
  const ordered = useMemo(
    () => [...slices].sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label, 'zh')),
    [slices],
  )

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
            onClick={() => onSelect(s.id)}
            onMouseEnter={() => onHoverId(s.id)}
            onMouseLeave={() => onHoverId(null)}
            className={[
              'flex w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 text-left transition',
              large ? 'py-1' : 'py-0.5',
              hoverId === s.id
                ? 'border-black/[0.12] bg-ganshale-page'
                : 'border-transparent hover:border-black/[0.06] hover:bg-ganshale-page/80',
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

function buildPieSlices(
  items: { id: string; label: string; seconds: number; color: string }[],
  total: number,
): PieSlice[] {
  const n = items.length
  let angle = 0
  return items.map((item) => {
    const share = total > 0 ? item.seconds / total : 0
    const sweep = total > 0 ? share * 360 : n > 0 ? 360 / n : 0
    const labelAngle = angle + sweep / 2
    const slice: PieSlice = {
      ...item,
      pct: pct(item.seconds, total),
      startAngle: angle,
      endAngle: angle + sweep,
      labelAngle,
    }
    angle += sweep
    return slice
  })
}

export function AppCategoryDistribution({
  day,
  events,
  ready,
}: {
  day: Date
  events: AwEvent[]
  ready: boolean
}) {
  const [categories, setCategories] = useState<AppCategoryDef[]>(() => loadAppCategoryConfig())
  const [detailModalId, setDetailModalId] = useState<string | null>(null)
  const [chartModalOpen, setChartModalOpen] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [chartHoverId, setChartHoverId] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)
  const { liveForeground, windowTrackingActive, collectionPausedByUser } = useGanshaleData()

  useEffect(() => {
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const eventsForAgg = useMemo(() => {
    void liveTick
    const today = isSameLocalCalendarDay(day, new Date())
    if (!today || !windowTrackingActive || collectionPausedByUser) return events
    const { event, seconds } = currentForegroundSegmentLive(
      events,
      liveForeground,
      Date.now(),
      true,
    )
    if (!event) return events
    return events.map((ev) => (ev.id === event.id ? { ...ev, duration: seconds } : ev))
  }, [day, events, liveForeground, windowTrackingActive, collectionPausedByUser, liveTick])

  const { totalSeconds, buckets } = useMemo(
    () => aggregateByAppCategories(day, eventsForAgg, categories),
    [day, eventsForAgg, categories],
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

  const pieItemsAll = useMemo(() => {
    const items = categories.map((cat, index) => ({
      id: cat.id,
      label: cat.name,
      seconds: buckets[cat.id]?.seconds ?? 0,
      color: pieColorForIndex(index),
    }))
    items.push({
      id: UNCATEGORIZED_ID,
      label: '未分类',
      seconds: buckets[UNCATEGORIZED_ID]?.seconds ?? 0,
      color: UNCATEGORIZED_BAR,
    })
    return pieItemsWithUsage(items)
  }, [categories, buckets])

  const pieItemsPreview = useMemo(
    () => collapsePieItemsTopN(pieItemsAll, PIE_PREVIEW_TOP_N),
    [pieItemsAll],
  )

  const slicesPreview = useMemo(
    () => buildPieSlices(pieItemsPreview, totalSeconds),
    [pieItemsPreview, totalSeconds],
  )
  const slicesAll = useMemo(
    () => buildPieSlices(pieItemsAll, totalSeconds),
    [pieItemsAll, totalSeconds],
  )

  const modalBucket = detailModalId ? buckets[detailModalId] : undefined

  const onSaveCategory = useCallback((id: string, name: string, keywords: string[]) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, name, keywords } : c))
      saveAppCategoryConfig(next)
      return next
    })
  }, [])

  const onDeleteCategory = useCallback((id: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id)
      saveAppCategoryConfig(next)
      return next
    })
  }, [])

  const onAddCategory = () => {
    const row = createEmptyCategory()
    setCategories((prev) => {
      const next = [...prev, row]
      saveAppCategoryConfig(next)
      return next
    })
    setDetailModalId(row.id)
  }

  const openSliceDetail = useCallback((id: string) => {
    if (id === PIE_OTHER_ID) return
    setChartModalOpen(false)
    setDetailModalId(id)
  }, [])

  const onPreviewSliceClick = useCallback((id: string) => {
    if (id === PIE_OTHER_ID) return
    setDetailModalId(id)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 p-2 sm:p-2.5">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <DashboardSectionTitle icon={PieChart}>应用分类分布</DashboardSectionTitle>
          <DashboardSectionSubtitle>开发、会议、文档、沟通等占比情况</DashboardSectionSubtitle>
        </div>
        {ready ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onAddCategory}
              className={PIE_CHART_ACTION_BTN_CLASS}
            >
              添加分类
            </button>
            {totalSeconds > 0 || pieItemsAll.length > PIE_PREVIEW_TOP_N ? (
              <button
                type="button"
                onClick={() => setChartModalOpen(true)}
                className={PIE_CHART_ACTION_BTN_CLASS}
              >
                查看大图
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!ready ? (
        <p className="py-6 text-center text-xs text-ganshale-muted">加载中…</p>
      ) : categories.length === 0 ? (
        <p className="py-6 text-center text-xs text-ganshale-muted">
          请先添加分类。
        </p>
      ) : pieItemsAll.length === 0 ? (
        <p className="py-6 text-center text-xs text-ganshale-muted">暂无窗口数据。</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-row items-center gap-2 overflow-hidden py-0.5 pl-2 sm:pl-3">
          <div className="flex shrink-0 items-center justify-center">
            <CategoryPieChart
              slices={slicesPreview}
              preset="compact"
              hoverId={hoverId}
              onHoverId={setHoverId}
              onSliceClick={onPreviewSliceClick}
            />
          </div>
          <CategoryPieLegend
            slices={slicesPreview}
            hoverId={hoverId}
            onHoverId={setHoverId}
            onSelect={onPreviewSliceClick}
            vertical
          />
        </div>
      )}

      {chartModalOpen && ready ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setChartModalOpen(false)
          }}
        >
          <div
            className={DASHBOARD_DETAIL_MODAL_SHELL_CLASS}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-pie-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-2 py-1.5 sm:px-3">
              <DashboardSectionTitle id="category-pie-modal-title" icon={PieChart}>
                应用分类分布
              </DashboardSectionTitle>
              <button
                type="button"
                onClick={() => setChartModalOpen(false)}
                className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
                aria-label="关闭"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
              <div className="flex min-h-0 w-full flex-row flex-wrap items-center justify-center gap-4 py-4">
                <div className="flex shrink-0 items-center justify-center">
                  <CategoryPieChart
                    slices={slicesAll}
                    preset="large"
                    hoverId={chartHoverId}
                    onHoverId={setChartHoverId}
                    onSliceClick={openSliceDetail}
                  />
                </div>
                <CategoryPieLegend
                  slices={slicesAll}
                  hoverId={chartHoverId}
                  onHoverId={setChartHoverId}
                  onSelect={openSliceDetail}
                  large
                  vertical
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detailModalId && modalBucket ? (
        <CategoryDetailModal
          categoryId={detailModalId}
          categories={categories}
          bucket={modalBucket}
          appPathByExe={appPathByExe}
          onClose={() => setDetailModalId(null)}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : null}
    </div>
  )
}
