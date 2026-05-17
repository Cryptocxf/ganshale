import { Clock3 } from 'lucide-react'
import { useMemo } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import {
  appTotalsForDay,
  formatDuration,
  hourBinsByEventStart,
  recentWindowRows,
  timelineFromWindowEvents,
  totalActiveSecondsWindow,
} from '../lib/aggregations'
import { AppBrandIcon } from './AppBrandIcon'
import { VisualAppDonut } from './visual/VisualAppDonut'
import { VisualHourHeat } from './visual/VisualHourHeat'
import { WindowActivityTable } from './WindowActivityTable'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'

export function OverviewDashboard() {
  const { day, windowEvents, eventCount, ready } = useGanshaleData()
  const windowEventsNet = useMemo(
    () => excludeGanshaleSelfWindowEvents(windowEvents),
    [windowEvents],
  )
  const dayMinutes = 24 * 60
  const timeline = timelineFromWindowEvents(day, windowEventsNet)
  const activeSec = totalActiveSecondsWindow(day, windowEventsNet)
  const focusBlocks = windowEventsNet.filter((e) => e.duration >= 25 * 60).length
  const recent = recentWindowRows(day, windowEventsNet, 4)
  const appTotals = appTotalsForDay(day, windowEventsNet)
  const hourBins = hourBinsByEventStart(day, windowEventsNet)

  const statCards = [
    { label: '窗口活跃', value: formatDuration(activeSec), sub: '今日合计' },
    { label: '专注段', value: `${focusBlocks}`, sub: '≥25 分钟' },
    { label: '窗口事件', value: `${windowEventsNet.length}`, sub: '当日条数' },
    { label: '事件库', value: `${eventCount.toLocaleString()}`, sub: '本地总计' },
  ] as const

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <section className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {statCards.map((card, i) => (
          <article
            key={card.label}
            className={[
              'relative overflow-hidden rounded-2xl border border-black/[0.06] p-3 shadow-sm',
              i === 0
                ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 text-white'
                : 'bg-white/85 backdrop-blur-sm',
            ].join(' ')}
          >
            {i === 0 ? (
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-2xl" />
            ) : null}
            <p
              className={[
                'text-[9px] font-semibold uppercase tracking-[0.16em]',
                i === 0 ? 'text-white/60' : 'text-ganshale-subtle',
              ].join(' ')}
            >
              {card.label}
            </p>
            <p
              className={[
                'mt-1.5 font-display text-lg font-semibold tabular-nums tracking-tight sm:text-xl',
                i === 0 ? 'text-white' : 'text-ganshale-text',
              ].join(' ')}
            >
              {card.value}
            </p>
            <p
              className={[
                'mt-0.5 text-[10px] leading-tight sm:text-[11px]',
                i === 0 ? 'text-white/70' : 'text-ganshale-muted',
              ].join(' ')}
            >
              {card.sub}
            </p>
          </article>
        ))}
      </section>

      <section className="grid min-h-0 flex-[1.4] grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-2">
        <div className="min-h-0 lg:col-span-5">
          <VisualAppDonut rows={appTotals} compact className="h-full" />
        </div>
        <div className="min-h-0 lg:col-span-7">
          <VisualHourHeat bins={hourBins} compact className="h-full" />
        </div>
      </section>

      <section className="shrink-0">
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 font-display text-xs font-semibold text-ganshale-text">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-ganshale-accent" strokeWidth={1.6} />
              时间分布
            </h2>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-ganshale-muted">
              {ready
                ? '按应用着色 · 数据只留在本机，写周报时可按日回看'
                : '加载中…'}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-black/[0.06] bg-white/70 px-2 py-0.5 text-[10px] text-ganshale-subtle">
            00:00 — 24:00
          </span>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white/80 p-2.5 shadow-sm">
          {!ready || timeline.length === 0 ? (
            <p className="py-6 text-center text-xs text-ganshale-muted">
              {!ready ? '加载中…' : '暂无数据。可在「设置」恢复演示数据。'}
            </p>
          ) : (
            <>
              <div className="flex h-9 w-full overflow-hidden rounded-xl bg-ganshale-track/90 ring-1 ring-black/[0.04]">
                {timeline.map((seg) => {
                  const width = ((seg.endMin - seg.startMin) / dayMinutes) * 100
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      title={seg.label}
                      style={{
                        width: `${Math.max(width, 0.15)}%`,
                        backgroundColor: seg.color,
                      }}
                      className="group relative h-full min-w-[2px] border-r border-black/[0.05] transition first:rounded-l-xl last:rounded-r-xl hover:brightness-95"
                    >
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.08] bg-white/95 px-1.5 py-0.5 text-[9px] text-ganshale-text opacity-0 shadow-md transition group-hover:opacity-100">
                        {seg.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-1.5 flex max-h-8 flex-wrap gap-x-2 gap-y-0.5 overflow-hidden">
                {[...new Map(timeline.map((s) => [s.label, s.color])).entries()].map(
                  ([label, color]) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 text-[10px] text-ganshale-muted"
                    >
                      <span
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {label}
                    </span>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden">
          <h2 className="mb-1 shrink-0 font-display text-xs font-semibold text-ganshale-text">
            最近窗口
          </h2>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/[0.06] bg-white/85 shadow-sm">
            {recent.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-ganshale-muted">无记录</p>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {recent.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start gap-2 px-2.5 py-2 transition hover:bg-white"
                  >
                    <AppBrandIcon
                      app={row.appFile}
                      appPath={row.appPath || undefined}
                      size={28}
                      className="mt-0.5 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-mono text-[10px] text-ganshale-subtle">
                          {row.time}
                        </span>
                        <span className="truncate text-xs font-medium text-ganshale-text">
                          {row.title}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-ganshale-muted">
                        {row.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 self-center rounded-full border border-black/[0.06] bg-ganshale-page px-2 py-0.5 text-[10px] text-ganshale-muted">
                      {row.duration}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <WindowActivityTable compact />
        </div>
      </section>
    </div>
  )
}
