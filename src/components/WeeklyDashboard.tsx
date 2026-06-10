import { useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import { useDashboardClockLive, useDashboardClockMs } from '../hooks/useDashboardClock'
import { useWeeklyReport } from '../context/WeeklyReportContext'
import { currentForegroundSegmentLive } from '../lib/aggregations'
import {
  MONITORED_APPS_CHANGED_EVENT,
  loadMonitoredAppPatterns,
} from '../lib/monitoredAppsStore'
import { compareLocalCalendarWeek, startOfWeekMondayLocal } from '../lib/timeutil'
import {
  addWeeksMondayLocal,
  countWorkDaysInWeek,
  formatWeekOverWeekCompare,
  isoWeekNumberLocal,
  loadWindowEventsForWeekRange,
  sumOfficeSecondsForWeek,
  sumOfficeSecondsForPrevWeekCompare,
} from '../lib/weeklyWorktime'
import { WeeklyDailyReportDetailsPanel } from './WeeklyDailyReportDetailsPanel'
import { WeeklyDailyDurationDistribution } from './WeeklyDailyDurationDistribution'
import { WeeklyWorkDurationCard } from './WeeklyWorkDurationCard'
import {
  WEEKLY_MIDDLE_SECTION_CLASS,
  WEEKLY_PAGE_CLASS,
  WEEKLY_REPORT_DETAILS_SECTION_CLASS,
} from './dashboardLayout'

function useMonitoredAppPatterns(): string[] {
  const [patterns, setPatterns] = useState(() => loadMonitoredAppPatterns())
  useEffect(() => {
    const sync = () => setPatterns(loadMonitoredAppPatterns())
    window.addEventListener(MONITORED_APPS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(MONITORED_APPS_CHANGED_EVENT, sync)
  }, [])
  return patterns
}

export function WeeklyDashboard() {
  const { weekStart, setWeekStart } = useWeeklyReport()

  useEffect(() => {
    setWeekStart(startOfWeekMondayLocal(new Date()))
  }, [setWeekStart])
  const { ready: dataReady, liveForeground, windowTrackingPaused } = useGanshaleData()
  const clockMs = useDashboardClockMs()
  const clockLive = useDashboardClockLive()
  const patterns = useMonitoredAppPatterns()
  const [currentWeekEvents, setCurrentWeekEvents] = useState<Awaited<
    ReturnType<typeof loadWindowEventsForWeekRange>
  > | null>(null)
  const [prevWeekEvents, setPrevWeekEvents] = useState<Awaited<
    ReturnType<typeof loadWindowEventsForWeekRange>
  > | null>(null)
  const [worktimeReady, setWorktimeReady] = useState(false)
  const [liveTick, setLiveTick] = useState(0)
  const weekKind = useMemo(() => compareLocalCalendarWeek(weekStart), [weekStart])
  const weekNo = useMemo(() => isoWeekNumberLocal(weekStart), [weekStart])

  useEffect(() => {
    let cancelled = false
    setWorktimeReady(false)
    const prevStart = addWeeksMondayLocal(weekStart, -1)
    Promise.all([
      loadWindowEventsForWeekRange(weekStart, 1),
      loadWindowEventsForWeekRange(prevStart, 1),
    ])
      .then(([cur, prev]) => {
        if (!cancelled) {
          setCurrentWeekEvents(cur)
          setPrevWeekEvents(prev)
          setWorktimeReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentWeekEvents([])
          setPrevWeekEvents([])
          setWorktimeReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [weekStart])

  useEffect(() => {
    if (weekKind !== 'current' || !clockLive) return
    const id = window.setInterval(() => setLiveTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [weekKind, clockLive])

  useEffect(() => {
    if (weekKind !== 'current' || !dataReady || !clockLive) return
    const id = window.setInterval(() => {
      loadWindowEventsForWeekRange(weekStart, 1)
        .then(setCurrentWeekEvents)
        .catch(() => {})
    }, 2500)
    return () => clearInterval(id)
  }, [weekKind, weekStart, dataReady, clockLive])

  const extrapolateToday = weekKind === 'current' && !windowTrackingPaused

  const weekEventsForUi = useMemo(() => {
    void liveTick
    if (!currentWeekEvents) return []
    if (!extrapolateToday) return currentWeekEvents
    const { event, seconds } = currentForegroundSegmentLive(
      currentWeekEvents,
      liveForeground,
      clockMs,
      true,
    )
    if (!event) return currentWeekEvents
    return currentWeekEvents.map((ev) =>
      ev.id === event.id ? { ...ev, duration: seconds } : ev,
    )
  }, [currentWeekEvents, liveForeground, extrapolateToday, clockMs, liveTick])

  const currentSec = useMemo(() => {
    void liveTick
    if (!currentWeekEvents) return 0
    return sumOfficeSecondsForWeek({
      weekStartMonday: weekStart,
      events: currentWeekEvents,
      patterns,
      live: liveForeground,
      now: new Date(clockMs),
      extrapolateToday,
    })
  }, [
    currentWeekEvents,
    weekStart,
    patterns,
    liveForeground,
    extrapolateToday,
    clockMs,
    liveTick,
  ])

  const prevSec = useMemo(() => {
    if (!prevWeekEvents) return 0
    return sumOfficeSecondsForPrevWeekCompare({
      weekStartMonday: weekStart,
      events: prevWeekEvents,
      patterns,
    })
  }, [prevWeekEvents, weekStart, patterns])

  const compare = useMemo(
    () => formatWeekOverWeekCompare(currentSec, prevSec),
    [currentSec, prevSec],
  )

  const workDays = useMemo(() => {
    void liveTick
    if (!currentWeekEvents) return 0
    return countWorkDaysInWeek({
      weekStartMonday: weekStart,
      events: currentWeekEvents,
      patterns,
      live: liveForeground,
      now: new Date(),
      extrapolateToday,
    })
  }, [weekStart, currentWeekEvents, patterns, liveForeground, extrapolateToday, liveTick])

  const avgSec = useMemo(() => {
    return workDays > 0 ? Math.round(currentSec / workDays) : 0
  }, [currentSec, workDays])

  const statsReady = dataReady && worktimeReady

  return (
    <div className={WEEKLY_PAGE_CLASS}>
      <section className={WEEKLY_REPORT_DETAILS_SECTION_CLASS}>
        <WeeklyDailyReportDetailsPanel weekStart={weekStart} />
      </section>

      <section className={WEEKLY_MIDDLE_SECTION_CLASS}>
        <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden p-2.5 sm:p-3">
          <WeeklyDailyDurationDistribution
            weekStart={weekStart}
            events={weekEventsForUi}
            patterns={patterns}
            live={liveForeground}
            extrapolateToday={extrapolateToday}
            ready={statsReady}
          />
        </div>
        <WeeklyWorkDurationCard
          weekStart={weekStart}
          weekNo={weekNo}
          ready={statsReady}
          currentSec={currentSec}
          compareLine={compare.line}
          compareTone={compare.tone}
          avgSec={avgSec}
          workDays={workDays}
          liveTotal={extrapolateToday}
        />
      </section>
    </div>
  )
}
