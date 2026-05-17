import { useEffect, useMemo, useState } from 'react'
import type { AwEvent } from '../lib/awTypes'
import {
  appTotalsFromWindowEvents,
  formatDuration,
  formatDurationHmsZh,
  totalSecondsWindowEvents,
} from '../lib/aggregations'
import * as store from '../lib/idbStore'
import { BUCKET_WINDOW } from '../lib/seed'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'
import {
  endOfWeekSundayLocal,
  parseYmdLocal,
  startOfWeekMondayLocal,
  toYmdLocal,
} from '../lib/timeutil'
import { SECONDARY_PAGE_CONTENT_CLASS } from './dashboardLayout'

export function WeeklyDashboard() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMondayLocal(new Date()))
  const [events, setEvents] = useState<AwEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const s = weekStart
      const e = endOfWeekSundayLocal(s)
      const list = await store.getEventsInRange(BUCKET_WINDOW, s.toISOString(), e.toISOString())
      if (!cancelled) {
        setEvents(excludeGanshaleSelfWindowEvents(list))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [weekStart])

  const sec = useMemo(() => totalSecondsWindowEvents(events), [events])
  const topApps = useMemo(() => appTotalsFromWindowEvents(events).slice(0, 8), [events])

  return (
    <div className={SECONDARY_PAGE_CONTENT_CLASS}>
      <div className="gs-card p-4">
        <label className="text-[10px] font-medium uppercase tracking-wide text-ganshale-subtle">
          周内任一天（自动对齐到当周周一）
        </label>
        <input
          type="date"
          value={toYmdLocal(weekStart)}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            setWeekStart(startOfWeekMondayLocal(parseYmdLocal(v)))
          }}
          className="mt-2 block max-w-[11rem] rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 font-mono text-xs shadow-sm"
        />
        <p className="mt-1 text-[10px] text-ganshale-muted">
          {toYmdLocal(weekStart)} — {toYmdLocal(endOfWeekSundayLocal(weekStart))}
        </p>
      </div>
      <div className="gs-card p-4">
        <h2 className="text-sm font-semibold text-ganshale-text">本周概括</h2>
        {loading ? (
          <p className="mt-3 text-sm text-ganshale-muted">加载中…</p>
        ) : (
          <>
            <p className="mt-2 font-display text-xl font-semibold tabular-nums text-ganshale-text">
              累积活跃 {formatDurationHmsZh(sec)}
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ganshale-subtle">
              应用 Top
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {topApps.length === 0 ? (
                <li className="text-ganshale-muted">本周暂无窗口数据</li>
              ) : (
                topApps.map((r) => (
                  <li key={r.app} className="flex justify-between gap-3 font-mono text-xs">
                    <span className="truncate text-ganshale-text">{r.app}</span>
                    <span className="shrink-0 text-ganshale-muted">{formatDuration(r.seconds)}</span>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
