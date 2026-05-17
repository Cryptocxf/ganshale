import { useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'
import type { TimelineSeg } from '../lib/aggregations'
import { hourHasTimelineActivity } from '../lib/workdayHourDetail'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { WorkdayHourDetailModal } from './WorkdayHourDetailModal'

export const TIMELINE_START_HOUR = 8
export const TIMELINE_END_HOUR = 24
const TIMELINE_SPAN_MIN = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60
const WORKDAY_HOUR_MARKS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i,
)

export type WorkdayTimelineSeg = {
  id: string
  label: string
  color: string
  start: number
  end: number
}

function clipTimelineSeg(seg: TimelineSeg): { start: number; end: number } | null {
  const startMin = TIMELINE_START_HOUR * 60
  const endMin = TIMELINE_END_HOUR * 60
  const cs = Math.max(seg.startMin, startMin)
  const ce = Math.min(seg.endMin, endMin)
  if (ce <= cs) return null
  return { start: cs, end: ce }
}

function timelinePctFromMin(min: number): number {
  const clamped = Math.max(TIMELINE_START_HOUR * 60, Math.min(min, TIMELINE_END_HOUR * 60))
  return ((clamped - TIMELINE_START_HOUR * 60) / TIMELINE_SPAN_MIN) * 100
}

export function workdayTimelineFromSegments(segments: TimelineSeg[]): WorkdayTimelineSeg[] {
  const clipped: WorkdayTimelineSeg[] = []
  for (const seg of segments) {
    const c = clipTimelineSeg(seg)
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

type WorkdayTimelineProps = {
  ready: boolean
  patternsCount: number
  /** 采集中与实时窗口记录同步，统计全部前台应用 */
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

  const legend = useMemo(
    () => [...new Map(timeline.map((s) => [s.label, s.color])).entries()],
    [timeline],
  )

  const hourHasData = useMemo(() => {
    const map = new Map<number, boolean>()
    for (let h = TIMELINE_START_HOUR; h < TIMELINE_END_HOUR; h++) {
      map.set(h, hourHasTimelineActivity(h, timeline))
    }
    return map
  }, [timeline])

  return (
    <section className="gs-card shrink-0 p-2.5 sm:p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <DashboardSectionTitle icon={Clock3}>时间分布</DashboardSectionTitle>
          <DashboardSectionSubtitle>
            {ready
              ? liveSync
                ? '统计8:00 — 24:00，采集中同步更新；有数据的小时可点击查看'
                : '统计8:00 — 24:00，按应用着色；有数据的小时可点击查看'
              : '加载中…'}
          </DashboardSectionSubtitle>
        </div>
        {ready && timelineWorkday.length > 0 && legend.length > 0 ? (
          <div className="flex max-w-[min(100%,28rem)] flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 sm:max-w-[55%]">
            {legend.map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1 text-[10px] text-ganshale-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {!ready || timelineWorkday.length === 0 ? (
        <p className="py-5 text-center text-xs text-ganshale-muted">
          {!ready
            ? '加载中…'
            : patternsCount === 0 && !liveSync
              ? '尚未加入监控应用，时间轴暂无数据。'
              : '暂无 8:00—24:00 内的窗口数据。'}
        </p>
      ) : (
        <>
          <div className="relative h-12 w-full overflow-hidden rounded-xl bg-ganshale-track/90 ring-1 ring-black/[0.04] sm:h-14">
            {WORKDAY_HOUR_MARKS.map((h) => {
              const left = timelinePctFromMin(h * 60)
              if (h === TIMELINE_END_HOUR) {
                return (
                  <span
                    key={h}
                    className="pointer-events-none absolute bottom-0 top-0 z-[2] w-px bg-black/10"
                    style={{ left: '100%', transform: 'translateX(-100%)' }}
                    aria-hidden
                  />
                )
              }
              return (
                <span
                  key={h}
                  className="pointer-events-none absolute bottom-0 top-0 z-[2] w-px bg-black/10"
                  style={{ left: `${left}%` }}
                  aria-hidden
                />
              )
            })}
            {timelineWorkday.map((seg) => {
              const left = timelinePctFromMin(seg.start)
              const width = timelinePctFromMin(seg.end) - left
              return (
                <button
                  key={seg.id}
                  type="button"
                  title={seg.label}
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 0.2)}%`,
                    backgroundColor: seg.color,
                  }}
                  className="group absolute bottom-0 top-0 z-[1] min-w-[2px] border-r border-black/[0.05] transition hover:brightness-95"
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.08] bg-white/95 px-1.5 py-0.5 text-[9px] text-ganshale-text opacity-0 shadow-md transition group-hover:opacity-100">
                    {seg.label}
                  </span>
                </button>
              )
            })}
            {Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }, (_, i) => {
              const h = TIMELINE_START_HOUR + i
              const left = timelinePctFromMin(h * 60)
              const width = timelinePctFromMin((h + 1) * 60) - left
              const hasData = hourHasData.get(h) ?? false
              if (!hasData) return null
              return (
                <button
                  key={`hour-hit-${h}`}
                  type="button"
                  onClick={() => setDetailHour(h)}
                  className="absolute bottom-0 top-0 z-[4] cursor-pointer rounded-sm transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ganshale-text/30"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  aria-label={`查看 ${h}:00 至 ${h + 1}:00 详情`}
                />
              )
            })}
          </div>
          <div className="relative mt-1.5 h-10 w-full sm:h-11">
            {WORKDAY_HOUR_MARKS.map((h) => {
              const isWorkStart = h === 9
              const isWorkEnd = h === 18
              const left = h === TIMELINE_END_HOUR ? 100 : timelinePctFromMin(h * 60)
              const intervalHour = h < TIMELINE_END_HOUR ? h : null
              const hasData =
                intervalHour !== null ? (hourHasData.get(intervalHour) ?? false) : false
              const labelClass = [
                'absolute top-0 flex -translate-x-1/2 flex-col items-center leading-none',
                isWorkStart || isWorkEnd
                  ? 'text-[9px] font-semibold text-emerald-800'
                  : 'text-[8px] tabular-nums text-ganshale-subtle',
              ].join(' ')

              if (intervalHour !== null && hasData) {
                const hourLeft = timelinePctFromMin(intervalHour * 60)
                const hourWidth = timelinePctFromMin((intervalHour + 1) * 60) - hourLeft
                return (
                  <button
                    key={`label-${h}`}
                    type="button"
                    onClick={() => setDetailHour(intervalHour)}
                    className={`${labelClass} z-[1] cursor-pointer rounded px-0.5 transition hover:text-ganshale-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-ganshale-text/25`}
                    style={{ left: `${hourLeft + hourWidth / 2}%` }}
                    aria-label={`查看 ${intervalHour}:00 至 ${intervalHour + 1}:00 详情`}
                  >
                    <span>{`${h}:00`}</span>
                    {isWorkStart ? <span className="mt-0.5 text-[8px]">上班时间</span> : null}
                    {isWorkEnd ? <span className="mt-0.5 text-[8px]">下班时间</span> : null}
                  </button>
                )
              }

              return (
                <span key={`label-${h}`} className={labelClass} style={{ left: `${left}%` }}>
                  <span>{`${h}:00`}</span>
                  {isWorkStart ? <span className="mt-0.5 text-[8px]">上班时间</span> : null}
                  {isWorkEnd ? <span className="mt-0.5 text-[8px]">下班时间</span> : null}
                </span>
              )
            })}
          </div>
        </>
      )}

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
