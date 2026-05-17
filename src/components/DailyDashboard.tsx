// AUTO-GENERATED — edit scripts/write-daily-dashboard.mjs then: npm run gen:dashboard

import { AppWindow, Timer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import {
  currentForegroundSegmentLive,
  formatDurationHmsZhFixed,
  timelineFromWindowEvents,
  timelineFromWindowEventsLive,
} from '../lib/aggregations'
import { persistLiveTodayFrozenSec } from '../lib/clientSessionClock'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'
import {
  MONITORED_APPS_CHANGED_EVENT,
  foregroundMatchesMonitoredPatterns,
  loadMonitoredAppPatterns,
} from '../lib/monitoredAppsStore'
import { sumMonitoredWindowSecondsForDayLive } from '../lib/monitoredWorktime'
import {
  compareLocalCalendarDay,
  formatDatetimeZhWithWeekday,
  isSameLocalCalendarDay,
  parseIso,
} from '../lib/timeutil'
import { CollectionStatusBadge } from './CollectionStatusBadge'
import { AppCategoryDistribution } from './AppCategoryDistribution'
import { AppDurationCompare } from './AppDurationCompare'
import { DailyWorkRecordPanel } from './DailyWorkRecordPanel'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_CARD_INSET_BOTTOM,
  DASHBOARD_CARD_INSET_X,
  DASHBOARD_CARD_INSET_TOP,
  DASHBOARD_WINDOW_LOG_PREVIEW_ROWS,
  DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX,
  DASHBOARD_BOTTOM_SECTION_CLASS,
  DASHBOARD_PAIR_SECTION_CLASS,
  DASHBOARD_PAGE_CLASS,
} from './dashboardLayout'
import { WorkdayTimeline, workdayTimelineFromSegments } from './WorkdayTimeline'
import { WindowEventTableBody, WindowTableHead } from './windowEventTable'
import { WindowLogModal } from './WindowLogModal'

function useMonitoredAppPatterns(): string[] {
  const [patterns, setPatterns] = useState(() => loadMonitoredAppPatterns())
  useEffect(() => {
    const sync = () => setPatterns(loadMonitoredAppPatterns())
    window.addEventListener(MONITORED_APPS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(MONITORED_APPS_CHANGED_EVENT, sync)
  }, [])
  return patterns
}

const WINDOW_TABLE_COLGROUP = (
  <colgroup>
    <col className="w-[10%]" />
    <col className="w-[12%]" />
    <col className="w-[12%]" />
    <col className="w-[12%]" />
    <col className="w-[42%]" />
    <col className="w-[12%]" />
  </colgroup>
)

export function DailyDashboard() {
  const {
    day,
    windowEvents,
    windowEventsToday,
    ready,
    refresh,
    windowTrackingActive,
    windowTrackingSupported,
    collectionPausedByUser,
    liveForeground,
  } = useGanshaleData()
  const patterns = useMonitoredAppPatterns()
  const [sessionTick, setSessionTick] = useState(0)
  const [windowLogModalOpen, setWindowLogModalOpen] = useState(false)

  const windowEventsNet = useMemo(() => excludeGanshaleSelfWindowEvents(windowEvents), [windowEvents])
  const windowEventsTodayNet = useMemo(
    () => excludeGanshaleSelfWindowEvents(windowEventsToday),
    [windowEventsToday],
  )
  const rowsMonitored = useMemo(() => {
    if (!patterns.length) return windowEventsNet
    return windowEventsNet.filter((ev) =>
      foregroundMatchesMonitoredPatterns(String(ev.data.app ?? ''), String(ev.data.title ?? ''), patterns),
    )
  }, [windowEventsNet, patterns])
  const isSelectedToday = useMemo(() => isSameLocalCalendarDay(day, new Date()), [day])
  const selectedDayKind = useMemo(() => compareLocalCalendarDay(day), [day])

  const extrapolateOfficeTotal =
    isSelectedToday && windowTrackingActive && !collectionPausedByUser

  useEffect(() => {
    const id = window.setInterval(() => setSessionTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const timeline = useMemo(
    () =>
      extrapolateOfficeTotal
        ? timelineFromWindowEventsLive(
            day,
            windowEventsNet,
            liveForeground,
            Date.now(),
            true,
          )
        : timelineFromWindowEvents(day, rowsMonitored),
    [
      day,
      windowEventsNet,
      rowsMonitored,
      liveForeground,
      sessionTick,
      extrapolateOfficeTotal,
    ],
  )
  const timelineWorkday = useMemo(() => workdayTimelineFromSegments(timeline), [timeline])

  useEffect(() => {
    void sessionTick
    persistLiveTodayFrozenSec(
      sumMonitoredWindowSecondsForDayLive(
        new Date(),
        windowEventsTodayNet,
        patterns,
        liveForeground,
        Date.now(),
        extrapolateOfficeTotal,
      ),
    )
  }, [sessionTick, windowEventsTodayNet, patterns, liveForeground, extrapolateOfficeTotal])

  const sessionElapsedSec = useMemo(
    () =>
      sumMonitoredWindowSecondsForDayLive(
        day,
        windowEventsNet,
        patterns,
        liveForeground,
        Date.now(),
        extrapolateOfficeTotal,
      ),
    [day, windowEventsNet, patterns, sessionTick, liveForeground, extrapolateOfficeTotal],
  )

  useEffect(() => {
    if (!ready || !isSelectedToday || !windowTrackingActive) return
    const id = window.setInterval(() => void refresh(), 2500)
    return () => clearInterval(id)
  }, [ready, isSelectedToday, windowTrackingActive, refresh])

  const allRows = useMemo(
    () => [...windowEventsNet].sort((a, b) => parseIso(b.timestamp) - parseIso(a.timestamp)),
    [windowEventsNet],
  )

  const windowPreviewRows = useMemo(
    () => allRows.slice(0, DASHBOARD_WINDOW_LOG_PREVIEW_ROWS),
    [allRows],
  )

  const liveWindowSegment = useMemo(() => {
    if (!extrapolateOfficeTotal) return null
    const { event, seconds } = currentForegroundSegmentLive(
      windowEventsNet,
      liveForeground,
      Date.now(),
      true,
    )
    if (!event) return null
    return { eventId: event.id, seconds }
  }, [windowEventsNet, liveForeground, extrapolateOfficeTotal, sessionTick])

  const nowDate = useMemo(() => new Date(), [sessionTick])

  return (
    <div className={DASHBOARD_PAGE_CLASS}>
      <section className={DASHBOARD_BOTTOM_SECTION_CLASS}>
        <div className="gs-card relative flex min-h-0 min-w-0 flex-col justify-center p-2 sm:p-2.5">
          <DashboardSectionTitle
            icon={Timer}
            suffix={
              <CollectionStatusBadge
                day={day}
                windowTrackingActive={windowTrackingActive}
                windowTrackingSupported={windowTrackingSupported}
              />
            }
          >
            {'\u4eca\u65e5\u529e\u516c\u603b\u65f6\u957f'}
          </DashboardSectionTitle>
          <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-center sm:py-2">
            <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-ganshale-text sm:text-2xl md:text-3xl lg:text-[1.35rem] xl:text-3xl">
              {formatDurationHmsZhFixed(sessionElapsedSec)}
            </p>
            {selectedDayKind === 'past' ? (
              <p className="text-[10px] text-ganshale-muted">{'\u5df2\u505c\u6b62'}</p>
            ) : selectedDayKind === 'future' ? (
              <p className="text-[10px] text-ganshale-muted">{'\u672a\u5f00\u59cb'}</p>
            ) : collectionPausedByUser ? (
              <p className="text-[10px] text-ganshale-muted">
                {'\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\uff1b\u6b21\u65e5 0 \u70b9\u6216\u70b9\u51fb\u300c\u4e0a\u73ed\u4e2d\u300d\u540e\u7ee7\u7eed\u7d2f\u8ba1\u3002'}
              </p>
            ) : extrapolateOfficeTotal ? (
              <p className="max-w-[14rem] text-[10px] leading-snug text-ganshale-muted">
                {'\u91c7\u96c6\u4e2d\u4e0e\u300c\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55\u300d\u540c\u6b65\u7d2f\u8ba1\u524d\u53f0\u65f6\u957f\u3002'}
              </p>
            ) : patterns.length === 0 ? (
              <p className="max-w-[14rem] text-[10px] leading-snug text-amber-800">{'\u672a\u914d\u7f6e\u76d1\u63a7\u5217\u8868\uff0c\u5f53\u524d\u7edf\u8ba1\u5168\u90e8\u524d\u53f0\u7a97\u53e3\u65f6\u957f\u3002'}</p>
            ) : (
              <p className="max-w-[14rem] text-[10px] leading-snug text-ganshale-muted">
                {'\u4ec5\u7edf\u8ba1\u76d1\u63a7\u5217\u8868\u4e2d\u7684\u5e94\u7528\u524d\u53f0\u65f6\u957f\u3002'}
              </p>
            )}
          </div>
          {isSelectedToday ? (
            <p className="pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular-nums text-ganshale-muted sm:bottom-3 sm:right-3">
              {formatDatetimeZhWithWeekday(nowDate)}
            </p>
          ) : null}
        </div>
        <div className="gs-card flex min-h-0 min-w-0 flex-col overflow-hidden">
          <AppCategoryDistribution day={day} events={allRows} ready={ready} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <DailyWorkRecordPanel day={day} events={allRows} />
        </div>
      </section>

      <WorkdayTimeline
        ready={ready}
        patternsCount={patterns.length}
        liveSync={extrapolateOfficeTotal}
        timeline={timeline}
        timelineWorkday={timelineWorkday}
      />

      <section className={DASHBOARD_PAIR_SECTION_CLASS}>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
            <div className={['flex shrink-0 items-start justify-between gap-2 border-b border-black/[0.06]', DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP, 'pb-2'].join(' ')}>
              <div className="min-w-0">
                <DashboardSectionTitle icon={AppWindow}>{'\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55'}</DashboardSectionTitle>
                <DashboardSectionSubtitle>{'\u8bb0\u5f55\u5168\u90e8\u524d\u53f0\u7a97\u53e3\uff0c\u6309\u5207\u6362\u65f6\u95f4\u5012\u5e8f\u5c55\u793a'}</DashboardSectionSubtitle>
              </div>
              {ready && allRows.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setWindowLogModalOpen(true)}
                  className="shrink-0 rounded-md border border-black/[0.08] bg-white px-2 py-0.5 text-[10px] font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page"
                >
                  {'\u67e5\u770b\u5168\u90e8'}
                </button>
              ) : null}
            </div>
            <div className={['min-w-0 overflow-x-hidden', DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_BOTTOM].join(' ')}>
              {!ready ? (
                <p className="py-4 text-center text-xs text-ganshale-muted">{'\u52a0\u8f7d\u4e2d\u2026'}</p>
              ) : allRows.length === 0 ? (
                <p className="py-4 text-center text-xs text-ganshale-muted">
                  {collectionPausedByUser
                    ? '\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\u3002'
                    : windowTrackingActive
                      ? '\u6682\u65e0\u7a97\u53e3\u8bb0\u5f55\uff0c\u5207\u6362\u5e94\u7528\u540e\u4f1a\u5728\u6b64\u663e\u793a\u3002'
                      : '\u5c1a\u672a\u5f00\u59cb\u91c7\u96c6\uff0c\u8bf7\u5728\u9876\u90e8\u70b9\u51fb\u300c\u4e0a\u73ed\u4e2d\u300d\u3002'}
                </p>
              ) : (
                <div
                  className="overflow-y-auto overflow-x-hidden border-b border-ganshale-border [scrollbar-gutter:stable]"
                  style={{ maxHeight: DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX }}
                >
                  <table className="w-full table-fixed border-collapse text-left">
                    {WINDOW_TABLE_COLGROUP}
                    <WindowTableHead />
                    <WindowEventTableBody rows={windowPreviewRows} liveSegment={liveWindowSegment} />
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
            <AppDurationCompare day={day} events={allRows} ready={ready} />
          </div>
        </div>
      </section>

      <WindowLogModal
        open={windowLogModalOpen}
        day={day}
        rows={allRows}
        liveSegment={liveWindowSegment}
        onClose={() => setWindowLogModalOpen(false)}
      />
    </div>
  )
}
