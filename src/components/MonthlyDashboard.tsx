import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMonthlyReport } from '../context/MonthlyReportContext'
import { useGanshaleData } from '../context/useGanshaleData'
import { loadAppCategoryConfig } from '../lib/appCategoryConfig'
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

export function MonthlyDashboard({ onNavigate }: { onNavigate: (key: NavKey) => void }) {
  const { monthAnchor, setSummaryState } = useMonthlyReport()
  const {
    ready: dataReady,
    setDay,
    liveForeground,
    windowTrackingActive,
    collectionPausedByUser,
  } = useGanshaleData()
  const [events, setEvents] = useState<AwEvent[]>(() => cachedMonthEvents(monthAnchor))
  const [prevEvents, setPrevEvents] = useState<AwEvent[]>(() =>
    cachedMonthEvents(addMonthsLocal(monthAnchor, -1)),
  )
  const [liveTick, setLiveTick] = useState(0)

  const monthKind = useMemo(() => compareLocalCalendarMonth(monthAnchor), [monthAnchor])

  useEffect(() => {
    if (monthKind !== 'current') return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [monthKind])

  useEffect(() => {
    if (monthKind !== 'current' || !dataReady) return
    const id = window.setInterval(() => {
      loadWindowEventsForMonth(monthAnchor)
        .then(setEvents)
        .catch(() => {})
    }, 2500)
    return () => clearInterval(id)
  }, [monthKind, monthAnchor, dataReady])

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
    return buildMonthlySummary(monthAnchor, events, prevEvents, categories)
  }, [monthAnchor, events, prevEvents])

  const extrapolateToday =
    monthKind === 'current' && windowTrackingActive && !collectionPausedByUser

  const liveKpi = useMemo(
    () => {
      void liveTick
      return buildMonthlyLiveKpi(monthAnchor, events, prevEvents, summary.calendarCells, {
        now: new Date(),
        live: liveForeground,
        extrapolateToday,
      })
    },
    [
      monthAnchor,
      events,
      prevEvents,
      summary.calendarCells,
      liveForeground,
      extrapolateToday,
      liveTick,
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
          <MonthlyCategoryMatrix summary={summary} />
          <MonthlyWeekBlocksPanel monthAnchor={monthAnchor} summary={summary} />
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
