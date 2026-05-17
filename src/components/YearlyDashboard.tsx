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
import { endOfYearLocal, startOfYearLocal } from '../lib/timeutil'
import { SECONDARY_PAGE_CONTENT_CLASS } from './dashboardLayout'

export function YearlyDashboard() {
  const [anchorYear] = useState(() => new Date().getFullYear())
  const [year, setYear] = useState(anchorYear)
  const [events, setEvents] = useState<AwEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const anchor = new Date(year, 5, 15, 12, 0, 0, 0)
      const s = startOfYearLocal(anchor)
      const e = endOfYearLocal(anchor)
      const list = await store.getEventsInRange(BUCKET_WINDOW, s.toISOString(), e.toISOString())
      if (!cancelled) {
        setEvents(excludeGanshaleSelfWindowEvents(list))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year])

  const sec = useMemo(() => totalSecondsWindowEvents(events), [events])
  const topApps = useMemo(() => appTotalsFromWindowEvents(events).slice(0, 12), [events])

  const years = useMemo(() => {
    const out: number[] = []
    for (let y = anchorYear - 6; y <= anchorYear + 1; y++) out.push(y)
    return out
  }, [anchorYear])

  return (
    <div className={SECONDARY_PAGE_CONTENT_CLASS}>
      <div className="gs-card p-4">
        <label className="text-[10px] font-medium uppercase tracking-wide text-ganshale-subtle">
          年份
        </label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="mt-2 block max-w-[10rem] rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 font-mono text-xs shadow-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y} 年
            </option>
          ))}
        </select>
      </div>
      <div className="gs-card p-4">
        <h2 className="text-sm font-semibold text-ganshale-text">本年概括</h2>
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
                <li className="text-ganshale-muted">该年暂无窗口数据</li>
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
