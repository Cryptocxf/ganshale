import { CalendarDays } from 'lucide-react'
import { useGanshaleData } from '../context/useGanshaleData'
import { timelineFromWindowEvents } from '../lib/aggregations'
import { formatDayLabel } from '../lib/timeutil'

function localDayValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDayValue(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function TimelineView() {
  const { day, setDay, windowEvents, ready } = useGanshaleData()
  const dayMinutes = 24 * 60
  const segments = timelineFromWindowEvents(day, windowEvents)

  return (
    <div className="space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-ganshale-text">
            按天查看
          </h2>
          <p className="mt-1 text-xs text-ganshale-muted">窗口活动 · 本地日界</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2 shadow-sm">
          <CalendarDays className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
          <span className="text-xs text-ganshale-subtle">日期</span>
          <input
            type="date"
            value={localDayValue(day)}
            onChange={(e) => setDay(parseLocalDayValue(e.target.value))}
            className="bg-transparent font-mono text-sm text-ganshale-text outline-none"
          />
        </label>
      </div>

      {!ready ? (
        <p className="text-sm text-ganshale-muted">加载中…</p>
      ) : segments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ganshale-border bg-ganshale-surface px-6 py-12 text-center text-sm text-ganshale-muted">
          当天无窗口事件。
        </div>
      ) : (
        <div className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
          <div className="mb-3 flex justify-between text-[11px] text-ganshale-subtle">
            <span>{formatDayLabel(day)}</span>
            <span>00:00 — 24:00</span>
          </div>
          <div className="flex h-12 w-full overflow-hidden rounded-lg bg-ganshale-track ring-1 ring-black/[0.04]">
            {segments.map((seg) => {
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
                  className="group relative h-full min-w-[2px] border-r border-black/[0.06] transition first:rounded-l-lg last:rounded-r-lg hover:opacity-90"
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-ganshale-border bg-ganshale-surface px-2 py-1 text-[10px] text-ganshale-text opacity-0 shadow-md transition group-hover:opacity-100">
                    {seg.label}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {[...new Map(segments.map((s) => [s.label, s.color])).entries()].map(
              ([label, color]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[11px] text-ganshale-muted"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
