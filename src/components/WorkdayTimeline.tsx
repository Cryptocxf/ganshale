import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import type { TimelineSeg } from '../lib/aggregations'
import { hourHasTimelineActivity } from '../lib/workdayHourDetail'
import {
  formatWorkdayClock,
  loadWorkdayHoursSettings,
  workdayEndMin,
  workdayStartMin,
  WORKDAY_HOURS_SETTINGS_CHANGED_EVENT,
  type WorkdayHoursSettings,
} from '../lib/workdayHoursConfig'
import { DASHBOARD_TIMELINE_SECTION_CLASS } from './dashboardLayout'
import { WorkdayHoursControls } from './WorkdayHoursControls'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { WorkdayHourDetailModal } from './WorkdayHourDetailModal'

/** 全天记录范围 */
export const TIMELINE_DAY_START_HOUR = 0
export const TIMELINE_DAY_END_HOUR = 24
/** 可见时间窗宽度（小时） */
export const TIMELINE_VIEWPORT_HOURS = 16
/** 窗口起始小时最大值：左端 0:00—16:00，右端 8:00—24:00 */
export const TIMELINE_WINDOW_MAX_START_HOUR =
  TIMELINE_DAY_END_HOUR - TIMELINE_VIEWPORT_HOURS

/** @deprecated 默认视窗左端为 8:00 */
export const TIMELINE_START_HOUR = 8

const DAY_END_MIN = TIMELINE_DAY_END_HOUR * 60
const VIEW_SPAN_MIN = TIMELINE_VIEWPORT_HOURS * 60

export type WorkdayTimelineSeg = {
  id: string
  label: string
  color: string
  start: number
  end: number
}

function clipTimelineSegToDay(seg: TimelineSeg): { start: number; end: number } | null {
  const cs = Math.max(seg.startMin, 0)
  const ce = Math.min(seg.endMin, DAY_END_MIN)
  if (ce <= cs) return null
  return { start: cs, end: ce }
}

export function workdayTimelineFromSegments(segments: TimelineSeg[]): WorkdayTimelineSeg[] {
  const clipped: WorkdayTimelineSeg[] = []
  for (const seg of segments) {
    const c = clipTimelineSegToDay(seg)
    if (!c) continue
    clipped.push({
      id: seg.id,
      label: seg.label,
      color: seg.color,
      start: c.start,
      end: c.end,
    })
  }
  return clipped
}

function viewPct(min: number, viewStartMin: number): number {
  const clamped = Math.max(viewStartMin, Math.min(min, viewStartMin + VIEW_SPAN_MIN))
  return ((clamped - viewStartMin) / VIEW_SPAN_MIN) * 100
}

function clampWindowStart(hour: number): number {
  return Math.min(TIMELINE_WINDOW_MAX_START_HOUR, Math.max(TIMELINE_DAY_START_HOUR, Math.round(hour)))
}

/** 平移范围：左端 0:00，右端 24:00（对应起始小时 0—8） */
function clampPanHours(hour: number): number {
  return Math.min(TIMELINE_WINDOW_MAX_START_HOUR, Math.max(TIMELINE_DAY_START_HOUR, hour))
}

const TIMELINE_GRID_LINE_CLASS =
  'pointer-events-none absolute bottom-0 top-0 z-[5] w-px bg-ganshale-text/28 shadow-[1px_0_0_0_rgb(15_23_42/0.06)]'

const TIMELINE_WORK_MARKER_LINE_CLASS =
  'pointer-events-none absolute bottom-0 top-0 z-[6] w-px bg-emerald-600/75'

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

type WorkdayTimelineProps = {
  ready: boolean
  patternsCount: number
  liveSync?: boolean
  timeline: TimelineSeg[]
  timelineWorkday: WorkdayTimelineSeg[]
}

export function WorkdayTimeline({
  ready,
  patternsCount,
  liveSync = false,
  timeline,
  timelineWorkday,
}: WorkdayTimelineProps) {
  const [detailHour, setDetailHour] = useState<number | null>(null)
  const [panHours, setPanHours] = useState(TIMELINE_START_HOUR)
  const [dragging, setDragging] = useState(false)
  const [workHours, setWorkHours] = useState<WorkdayHoursSettings>(() => loadWorkdayHoursSettings())

  const trackRef = useRef<HTMLDivElement>(null)
  const panSurfaceRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startPan: number
    moved: boolean
    captured: boolean
  } | null>(null)
  const snapAnimRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)

  const panClamped = clampPanHours(panHours)
  const snappedHour = clampWindowStart(Math.round(panClamped))
  const markStartHour = Math.floor(panClamped)
  const markEndHour = markStartHour + TIMELINE_VIEWPORT_HOURS
  const viewStartMin = panClamped * 60
  const viewHourMarks = useMemo(
    () =>
      Array.from({ length: TIMELINE_VIEWPORT_HOURS + 1 }, (_, i) => markStartHour + i).filter(
        (h) => h >= TIMELINE_DAY_START_HOUR && h <= TIMELINE_DAY_END_HOUR,
      ),
    [markStartHour],
  )

  useEffect(() => {
    const sync = () => setWorkHours(loadWorkdayHoursSettings())
    window.addEventListener(WORKDAY_HOURS_SETTINGS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(WORKDAY_HOURS_SETTINGS_CHANGED_EVENT, sync)
  }, [])

  useEffect(() => {
    return () => {
      if (snapAnimRef.current !== null) cancelAnimationFrame(snapAnimRef.current)
    }
  }, [])

  const legend = useMemo(
    () => [...new Map(timeline.map((s) => [s.label, s.color])).entries()],
    [timeline],
  )

  const hourHasData = useMemo(() => {
    const map = new Map<number, boolean>()
    for (let h = TIMELINE_DAY_START_HOUR; h < TIMELINE_DAY_END_HOUR; h++) {
      map.set(h, hourHasTimelineActivity(h, timeline))
    }
    return map
  }, [timeline])

  const viewEndMin = viewStartMin + VIEW_SPAN_MIN
  const workStartMinute = workdayStartMin(workHours)
  const workEndMinute = workdayEndMin(workHours)
  const workBoundaryMarks = useMemo(() => {
    const marks: { min: number; kind: 'start' | 'end' }[] = []
    for (const [min, kind] of [
      [workStartMinute, 'start'],
      [workEndMinute, 'end'],
    ] as const) {
      if (min < viewStartMin || min > viewEndMin) continue
      if (min % 60 !== 0) marks.push({ min, kind })
    }
    return marks
  }, [workEndMinute, workStartMinute, viewEndMin, viewStartMin])
  const visibleSegments = useMemo(() => {
    const out: WorkdayTimelineSeg[] = []
    for (const seg of timelineWorkday) {
      const start = Math.max(seg.start, viewStartMin)
      const end = Math.min(seg.end, viewEndMin)
      if (end <= start) continue
      out.push({ ...seg, start, end })
    }
    return out
  }, [timelineWorkday, viewStartMin, viewEndMin])

  const snapPanToHour = useCallback((from: number, to: number) => {
    if (snapAnimRef.current !== null) cancelAnimationFrame(snapAnimRef.current)
    const fromClamped = clampPanHours(from)
    const toClamped = clampPanHours(to)
    const start = performance.now()
    const duration = 320
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(t)
      setPanHours(clampPanHours(fromClamped + (toClamped - fromClamped) * eased))
      if (t < 1) {
        snapAnimRef.current = requestAnimationFrame(tick)
      } else {
        snapAnimRef.current = null
        setPanHours(toClamped)
      }
    }
    snapAnimRef.current = requestAnimationFrame(tick)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (snapAnimRef.current !== null) {
        cancelAnimationFrame(snapAnimRef.current)
        snapAnimRef.current = null
      }

      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startPan: panClamped,
        moved: false,
        captured: false,
      }
      setDragging(true)
    },
    [panClamped],
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const width = trackRef.current?.clientWidth ?? 0
    if (width <= 0) return
    const hourWidth = width / TIMELINE_VIEWPORT_HOURS
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 8) {
      drag.moved = true
      if (!drag.captured) {
        drag.captured = true
        panSurfaceRef.current?.setPointerCapture(e.pointerId)
      }
    }
    if (!drag.moved) return
    // 手指左拖 → 时间轴内容左移
    const next = clampPanHours(drag.startPan - dx / hourWidth)
    setPanHours(next)
  }, [])

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const moved = drag.moved
      dragRef.current = null
      setDragging(false)
      if (drag.captured) {
        try {
          panSurfaceRef.current?.releasePointerCapture(e.pointerId)
        } catch {
          /* already released */
        }
      }
      const clamped = clampPanHours(panHours)
      const target = clampWindowStart(Math.round(clamped))
      if (Math.abs(clamped - target) > 0.002) {
        snapPanToHour(clamped, target)
      } else {
        setPanHours(target)
      }
      if (moved) suppressClickRef.current = true
    },
    [panHours, snapPanToHour],
  )

  const openHourDetail = useCallback((hour: number) => {
    if (hour < TIMELINE_DAY_START_HOUR || hour >= TIMELINE_DAY_END_HOUR) return
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setDetailHour(hour)
  }, [])

  const openSegmentDetail = useCallback(
    (hour: number) => {
      openHourDetail(hour)
    },
    [openHourDetail],
  )

  const hasAnyData = timelineWorkday.length > 0

  return (
    <section
      className={[
        DASHBOARD_TIMELINE_SECTION_CLASS.replace(
          'overflow-hidden',
          'overflow-x-visible overflow-y-hidden',
        ),
      ].join(' ')}
    >
      <div className="mb-0.5 flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <DashboardSectionTitle
            icon={Clock3}
            description={DASHBOARD_SECTION_DESCRIPTIONS.dailyTimeline}
          >
            时间分布
          </DashboardSectionTitle>
        </div>
        <WorkdayHoursControls />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!ready || !hasAnyData ? (
          <p className="flex h-full items-center justify-center px-2 text-center text-xs text-ganshale-muted">
            {!ready
              ? '加载中…'
              : patternsCount === 0 && !liveSync
                ? '尚未加入监控应用，时间轴暂无数据。'
                : '暂无 0:00—24:00 内的窗口数据。'}
          </p>
        ) : (
          <div className="flex h-full min-h-0 flex-col pt-2 sm:pt-3">
            <div
              ref={panSurfaceRef}
              className={[
                'w-full shrink-0 touch-none select-none',
                dragging ? 'cursor-grabbing' : 'cursor-grab',
              ].join(' ')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div
                className={[
                  'overflow-hidden rounded-lg bg-ganshale-track/90 ring-1 ring-ganshale-border transition-[box-shadow,transform] duration-200',
                  dragging
                    ? 'scale-[0.996] shadow-md ring-ganshale-text/15'
                    : 'shadow-sm',
                ].join(' ')}
              >
                <div
                  ref={trackRef}
                  role="group"
                  aria-label={`时间分布 ${snappedHour}:00 至 ${snappedHour + TIMELINE_VIEWPORT_HOURS}:00，拖动平移`}
                  className="relative h-[2.1rem] w-full overflow-hidden bg-transparent sm:h-[2.45rem]"
                >
              {viewHourMarks.map((h) => {
                const left = viewPct(h * 60, viewStartMin)
                const isLast = h === markEndHour
                return (
                  <span
                    key={`grid-${h}`}
                    className={TIMELINE_GRID_LINE_CLASS}
                    style={
                      isLast
                        ? { left: '100%', transform: 'translateX(-100%)' }
                        : { left: `${left}%` }
                    }
                    aria-hidden
                  />
                )
              })}
              {[workStartMinute, workEndMinute].map((min) => {
                if (min < viewStartMin || min > viewEndMin) return null
                const left = viewPct(min, viewStartMin)
                return (
                  <span
                    key={`work-line-${min}`}
                    className={TIMELINE_WORK_MARKER_LINE_CLASS}
                    style={{ left: `${left}%` }}
                    aria-hidden
                  />
                )
              })}
              {visibleSegments.map((seg) => {
                const left = viewPct(seg.start, viewStartMin)
                const width = viewPct(seg.end, viewStartMin) - left
                const hour = Math.floor(seg.start / 60)
                const segHasDetail = hourHasData.get(hour) ?? false
                return (
                  <button
                    key={seg.id}
                    type="button"
                    title={seg.label}
                    data-timeline-interactive={segHasDetail ? '' : undefined}
                    onClick={segHasDetail ? () => openSegmentDetail(hour) : undefined}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 0.05)}%`,
                      backgroundColor: seg.color,
                    }}
                    className={[
                      'group absolute bottom-0 top-0 z-[3] min-w-0 rounded-none',
                      segHasDetail
                        ? 'cursor-pointer transition hover:brightness-95'
                        : 'pointer-events-none',
                    ].join(' ')}
                  >
                    <span className="gs-tooltip-surface pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] opacity-0 transition group-hover:opacity-100">
                      {seg.label}
                    </span>
                  </button>
                )
              })}
              </div>
            </div>
            <div className="relative mt-1.5 h-[1.925rem] w-full shrink-0 sm:h-[2.1rem]">
              {viewHourMarks.map((h) => {
                const isFirst = h === markStartHour
                const isLast = h === markEndHour
                const isWorkStart = h * 60 === workStartMinute
                const isWorkEnd = h * 60 === workEndMinute
                const tickLeft = isLast ? 100 : viewPct(h * 60, viewStartMin)
                const intervalHour = h < markEndHour ? h : null
                const hasData =
                  intervalHour !== null ? (hourHasData.get(intervalHour) ?? false) : false
                const labelClass = [
                  'absolute top-0 flex flex-col leading-none',
                  isFirst
                    ? 'left-0 translate-x-0 items-start'
                    : isLast
                      ? 'left-full -translate-x-full items-end'
                      : '-translate-x-1/2 items-center',
                  isWorkStart || isWorkEnd
                    ? 'text-[12px] font-medium text-emerald-800'
                    : 'text-[11px] tabular-nums text-ganshale-muted',
                ].join(' ')
                const labelStyle = isFirst || isLast ? undefined : { left: `${tickLeft}%` }

                if (intervalHour !== null && hasData) {
                  return (
                    <button
                      key={`label-${h}`}
                      type="button"
                      data-timeline-interactive=""
                      onClick={() => openHourDetail(intervalHour)}
                      className={`${labelClass} z-[1] cursor-pointer rounded px-0.5 transition hover:text-ganshale-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-ganshale-text/25`}
                      style={labelStyle}
                      aria-label={`查看 ${intervalHour}:00 至 ${intervalHour + 1}:00 详情`}
                    >
                      <span>{`${h}:00`}</span>
                      {isWorkStart ? (
                        <span className="mt-0.5 text-[10px] text-emerald-800/90">上班时间</span>
                      ) : null}
                      {isWorkEnd ? (
                        <span className="mt-0.5 text-[10px] text-emerald-800/90">下班时间</span>
                      ) : null}
                    </button>
                  )
                }

                return (
                  <span key={`label-${h}`} className={labelClass} style={labelStyle}>
                    <span>{`${h}:00`}</span>
                    {isWorkStart ? (
                      <span className="mt-0.5 text-[10px] text-emerald-800/90">上班时间</span>
                    ) : null}
                    {isWorkEnd ? (
                      <span className="mt-0.5 text-[10px] text-emerald-800/90">下班时间</span>
                    ) : null}
                  </span>
                )
              })}
              {workBoundaryMarks.map((mark) => {
                const left = viewPct(mark.min, viewStartMin)
                const hour = Math.floor(mark.min / 60)
                const minute = mark.min % 60
                const caption = mark.kind === 'start' ? '上班时间' : '下班时间'
                return (
                  <span
                    key={`work-mark-${mark.kind}-${mark.min}`}
                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center leading-none text-[12px] font-medium text-emerald-800"
                    style={{ left: `${left}%` }}
                  >
                    <span>{formatWorkdayClock(hour, minute)}</span>
                    <span className="mt-0.5 text-[10px] text-emerald-800/90">{caption}</span>
                  </span>
                )
              })}
            </div>
            </div>
            {legend.length > 0 ? (
              <div className="mt-1.5 w-full shrink-0" aria-label="应用图例">
                <div className="flex w-full flex-wrap content-start items-center gap-x-3 gap-y-1">
                  {legend.map(([label, color]) => (
                    <span
                      key={label}
                      className="inline-flex max-w-full items-center gap-1 text-[10px] text-ganshale-muted"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="truncate">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {detailHour !== null ? (
        <WorkdayHourDetailModal
          hour={detailHour}
          timeline={timeline}
          onClose={() => setDetailHour(null)}
        />
      ) : null}
    </section>
  )
}
