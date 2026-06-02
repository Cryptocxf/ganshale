import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMonthlyReport } from '../context/MonthlyReportContext'
import { useGanshaleData } from '../context/useGanshaleData'
import { useDashboardClockLive, useDashboardClockMs } from '../hooks/useDashboardClock'
import { loadAppCategoryConfig } from '../lib/appCategoryConfig'
import {
  MONITORED_APPS_CHANGED_EVENT,
  loadMonitoredAppPatterns,
} from '../lib/monitoredAppsStore'
import type { AwEvent } from '../lib/awTypes'
import {
  addMonthsLocal,
  buildMonthlyLiveKpi,
  buildMonthlySummary,
  compareLocalCalendarMonth,
  loadWindowEventsForMonth,
  peekCachedWindowEventsForMonth,
  type MonthlySummary,
} from '../lib/monthlyWorktime'
import { parseYmdLocal } from '../lib/timeutil'
import type { NavKey } from '../data/mock'
import { MonthlyActivityCalendar } from './MonthlyActivityCalendar'
import { MonthlyCategoryMatrix } from './MonthlyCategoryMatrix'
import { MonthlyInsightsPanel } from './MonthlyInsightsPanel'
import { MonthlyWeekBlocksPanel } from './MonthlyWeekBlocksPanel'
import { MonthlyKpiRow } from './MonthlyKpiRow'
import {
  MONTHLY_MAIN_GRID_CLASS,
  MONTHLY_MAIN_LEFT_COLUMN_CLASS,
  MONTHLY_MAIN_RIGHT_COLUMN_CLASS,
  MONTHLY_PAGE_CLASS,
} from './dashboardLayout'

function cachedMonthEvents(monthAnchor: Date): AwEvent[] {
  return peekCachedWindowEventsForMonth(monthAnchor) ?? []
}

function useMonitoredAppPatterns(): string[] {
  const [patterns, setPatterns] = useState(() => loadMonitoredAppPatterns())
  useEffect(() => {
    const sync = () => setPatterns(loadMonitoredAppPatterns())
    window.addEventListener(MONITORED_APPS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(MONITORED_APPS_CHANGED_EVENT, sync)
  }, [])
  return patterns
}

export function MonthlyDashboard({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { monthAnchor, setSummaryState } = useMonthlyReport()
  const { ready: dataReady, setDay, liveForeground, getWorkdayPausedMs } = useGanshaleData()
  const patterns = useMonitoredAppPatterns()
  const clockMs = useDashboardClockMs()
  const clockLive = useDashboardClockLive()
  const [events, setEvents] = useState<AwEvent[]>(() => cachedMonthEvents(monthAnchor))
  const [prevEvents, setPrevEvents] = useState<AwEvent[]>(() =>
    cachedMonthEvents(addMonthsLocal(monthAnchor, -1)),
  )
  const [liveTick, setLiveTick] = useState(0)

  const monthKind = useMemo(() => compareLocalCalendarMonth(monthAnchor), [monthAnchor])

  useEffect(() => {
    if (monthKind !== 'current' || !clockLive) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [monthKind, clockLive])

  useEffect(() => {
    if (monthKind !== 'current' || !dataReady || !clockLive) return
    const id = window.setInterval(() => {
      loadWindowEventsForMonth(monthAnchor)
        .then(setEvents)
        .catch(() => {})
    }, 2500)
    return () => clearInterval(id)
  }, [monthKind, monthAnchor, dataReady, clockLive])

  useEffect(() => {
    let cancelled = false
    const prevMonth = addMonthsLocal(monthAnchor, -1)

    const curCached = peekCachedWindowEventsForMonth(monthAnchor)
    const prevCached = peekCachedWindowEventsForMonth(prevMonth)
    if (curCached) setEvents(curCached)
    if (prevCached) setPrevEvents(prevCached)

    Promise.all([
      loadWindowEventsForMonth(monthAnchor),
      loadWindowEventsForMonth(prevMonth),
    ])
      .then(([cur, prev]) => {
        if (!cancelled) {
          setEvents(cur)
          setPrevEvents(prev)
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (!curCached) setEvents([])
          if (!prevCached) setPrevEvents([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [monthAnchor])

  const summary = useMemo<MonthlySummary>(() => {
    const categories = loadAppCategoryConfig()
    return buildMonthlySummary(monthAnchor, events, prevEvents, categories, new Date(clockMs), patterns)
  }, [monthAnchor, events, prevEvents, patterns, clockMs])

  const extrapolateToday = monthKind === 'current'

  const liveKpi = useMemo(
    () => {
      void liveTick
      return buildMonthlyLiveKpi(monthAnchor, events, prevEvents, summary.calendarCells, {
        patterns,
        now: new Date(clockMs),
        live: liveForeground,
        extrapolateToday,
        pausedMsToday: extrapolateToday ? getWorkdayPausedMs(clockMs) : 0,
      })
    },
    [
      monthAnchor,
      events,
      prevEvents,
      summary.calendarCells,
      patterns,
      liveForeground,
      extrapolateToday,
      clockMs,
      liveTick,
      getWorkdayPausedMs,
    ],
  )

  useEffect(() => {
    setSummaryState(true, summary)
  }, [summary, setSummaryState])

  const onDayClick = useCallback(
    (ymd: string) => {
      setDay(parseYmdLocal(ymd))
      onNavigate('daily')
    },
    [setDay, onNavigate],
  )

  return (
    <div className={MONTHLY_PAGE_CLASS}>
      <MonthlyKpiRow summary={summary} liveKpi={liveKpi} />

      <section className={MONTHLY_MAIN_GRID_CLASS}>
        <div className={MONTHLY_MAIN_LEFT_COLUMN_CLASS}>
          <MonthlyWeekBlocksPanel monthAnchor={monthAnchor} summary={summary} />
          <MonthlyCategoryMatrix summary={summary} />
        </div>
        <div className={MONTHLY_MAIN_RIGHT_COLUMN_CLASS}>
          <MonthlyActivityCalendar
            monthAnchor={monthAnchor}
            cells={summary.calendarCells}
            onDayClick={onDayClick}
          />
          <MonthlyInsightsPanel summary={summary} />
        </div>
      </section>
    </div>
  )
}
