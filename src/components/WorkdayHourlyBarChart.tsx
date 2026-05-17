import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration, type TimelineSeg } from '../lib/aggregations'

export const WORKDAY_CHART_START_HOUR = 8
export const WORKDAY_CHART_END_HOUR = 24
const WORKDAY_CELLS_PER_HOUR = 6
const DAY_START_MIN = WORKDAY_CHART_START_HOUR * 60
const DAY_END_MIN = WORKDAY_CHART_END_HOUR * 60
const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN
const ROW_HEIGHT_PX = 22
const Y_LABEL_WIDTH_PX = 76
const X_AXIS_HEIGHT_PX = 22
const PLOT_MAX_HEIGHT_PX = 176

function formatHourTick(h: number): string {
  return `${h}:00`
}

type AppRow = { label: string; color: string; totalSec: number }

function workdaySegments(segments: TimelineSeg[]): TimelineSeg[] {
  return segments
    .map((seg) => {
      const cs = Math.max(seg.startMin, DAY_START_MIN)
      const ce = Math.min(seg.endMin, DAY_END_MIN)
      if (ce <= cs) return null
      return { ...seg, startMin: cs, endMin: ce }
    })
    .filter((s): s is TimelineSeg => s !== null)
}

function minToPercent(min: number): number {
  return ((min - DAY_START_MIN) / DAY_SPAN_MIN) * 100
}

export function WorkdayHourlyBarChart({ segments }: { segments: TimelineSeg[] }) {
  const hourCount = WORKDAY_CHART_END_HOUR - WORKDAY_CHART_START_HOUR
  const gridCols = hourCount * WORKDAY_CELLS_PER_HOUR

  const clipped = useMemo(() => workdaySegments(segments), [segments])

  const appRows = useMemo(() => {
    const map = new Map<string, AppRow>()
    for (const seg of clipped) {
      const sec = Math.round((seg.endMin - seg.startMin) * 60)
      const prev = map.get(seg.label)
      if (prev) prev.totalSec += sec
      else map.set(seg.label, { label: seg.label, color: seg.color, totalSec: sec })
    }
    return [...map.values()].sort((a, b) => b.totalSec - a.totalSec)
  }, [clipped])

  const plotWrapRef = useRef<HTMLDivElement>(null)
  const [plotWidth, setPlotWidth] = useState(320)

  useEffect(() => {
    const el = plotWrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setPlotWidth(Math.max(1, entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rowCount = Math.max(appRows.length, 1)
  const plotHeight = Math.min(rowCount * ROW_HEIGHT_PX, PLOT_MAX_HEIGHT_PX)
  const xGridStepPx = plotWidth / gridCols

  const hourMarks = useMemo(
    () => Array.from({ length: hourCount + 1 }, (_, i) => WORKDAY_CHART_START_HOUR + i),
    [hourCount],
  )

  const segmentsByApp = useMemo(() => {
    const map = new Map<string, TimelineSeg[]>()
    for (const seg of clipped) {
      const list = map.get(seg.label)
      if (list) list.push(seg)
      else map.set(seg.label, [seg])
    }
    return map
  }, [clipped])

  return (
    <div className="flex gap-1">
      <div
        className="shrink-0 overflow-hidden pr-0.5"
        style={{ width: Y_LABEL_WIDTH_PX, height: plotHeight }}
      >
        {appRows.length === 0 ? (
          <span className="text-[8px] text-ganshale-subtle">—</span>
        ) : (
          appRows.map((app) => (
            <div
              key={app.label}
              className="flex items-center justify-end border-b border-black/[0.04] pr-1 text-[8px] leading-tight text-ganshale-muted last:border-b-0"
              style={{ height: ROW_HEIGHT_PX }}
              title={app.label}
            >
              <span className="line-clamp-2 break-all text-right">{app.label}</span>
            </div>
          ))
        )}
      </div>

      <div ref={plotWrapRef} className="min-w-0 flex-1">
        <div
          className="relative overflow-y-auto border-b border-l border-black/[0.1] bg-ganshale-page/30"
          style={{ width: plotWidth, height: plotHeight }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: `${xGridStepPx}px 100%`,
            }}
          />
          {hourMarks.map((hour) => {
            const i = hour - WORKDAY_CHART_START_HOUR
            return (
              <div
                key={`hour-line-${hour}`}
                className="pointer-events-none absolute top-0 bottom-0 z-[1] border-l border-black/15"
                style={{ left: (i / hourCount) * plotWidth }}
              />
            )
          })}
          {appRows.length === 0 ? (
            <p className="flex h-full items-center justify-center text-[10px] text-ganshale-muted">
              暂无时段数据
            </p>
          ) : (
            appRows.map((app) => (
              <div
                key={app.label}
                className="relative border-b border-black/[0.04] last:border-b-0"
                style={{ height: ROW_HEIGHT_PX }}
              >
                {(segmentsByApp.get(app.label) ?? []).map((seg) => {
                  const left = minToPercent(seg.startMin)
                  const width = minToPercent(seg.endMin) - left
                  const durSec = Math.round((seg.endMin - seg.startMin) * 60)
                  return (
                    <div
                      key={seg.id}
                      className="absolute top-1 bottom-1 min-w-[2px] rounded-sm ring-1 ring-black/[0.04]"
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 0.12)}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.label} · ${formatDuration(durSec)}`}
                    />
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="relative w-full" style={{ width: plotWidth, height: X_AXIS_HEIGHT_PX }}>
          {hourMarks.map((hour) => {
            const i = hour - WORKDAY_CHART_START_HOUR
            const left = (i / hourCount) * plotWidth
            const isFirst = hour === WORKDAY_CHART_START_HOUR
            const isLast = hour === WORKDAY_CHART_END_HOUR
            const isWorkStart = hour === 9
            const isWorkEnd = hour === 18
            return (
              <div
                key={`tick-${hour}`}
                className={[
                  'absolute top-0 flex flex-col leading-none',
                  isFirst
                    ? 'translate-x-0 items-start'
                    : isLast
                      ? '-translate-x-full items-end'
                      : '-translate-x-1/2 items-center',
                ].join(' ')}
                style={{ left: isLast ? plotWidth : left }}
              >
                <span
                  className={[
                    'text-[8px] tabular-nums',
                    isWorkStart || isWorkEnd ? 'font-semibold text-emerald-800' : 'text-ganshale-subtle',
                  ].join(' ')}
                >
                  {formatHourTick(hour)}
                </span>
                {isWorkStart ? (
                  <span className="mt-0.5 text-[7px] text-emerald-800">上班</span>
                ) : null}
                {isWorkEnd ? <span className="mt-0.5 text-[7px] text-emerald-800">下班</span> : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
