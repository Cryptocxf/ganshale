// AUTO-GENERATED — edit scripts/write-daily-dashboard.mjs then: npm run gen:dashboard

import { AppWindow, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import {
  currentForegroundSegmentLive,
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
  formatOfficeDurationDayFooterZh,
  isSameLocalCalendarDay,
  parseIso,
} from '../lib/timeutil'
import { CollectionStatusBadge } from './CollectionStatusBadge'
import { AppCategoryDistribution } from './AppCategoryDistribution'
import { AppDurationCompare } from './AppDurationCompare'
import { DailyWorkRecordPanel } from './DailyWorkRecordPanel'
import { useAppDisplayNamesRevision } from '../hooks/useAppDisplayNamesRevision'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_WINDOW_LOG_PREVIEW_ROWS,
  DASHBOARD_BOTTOM_SECTION_CLASS,
  DASHBOARD_HEADER_ACTIONS_ROW_CLASS,
  DASHBOARD_PAIR_CARD_BODY_CLASS,
  DASHBOARD_PAIR_CARD_HEADER_CLASS,
  DASHBOARD_PAIR_SCROLL_BODY_CLASS,
  DASHBOARD_WINDOW_TABLE_FRAME_CLASS,
  DASHBOARD_WINDOW_TABLE_SCROLL_CLASS,
  DASHBOARD_PAIR_SECTION_CLASS,
  DASHBOARD_PAGE_CLASS,
  DASHBOARD_TOP_CARD_BODY_CLASS,
} from './dashboardLayout'
import { WorkdayTimeline, workdayTimelineFromSegments } from './WorkdayTimeline'
import { DashboardHeaderActionSlot } from './DashboardHeaderActionSlot'
import { OfficeDurationHmsDisplay } from './OfficeDurationHmsDisplay'
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
  const nameRev = useAppDisplayNamesRevision()
  const [sessionTick, setSessionTick] = useState(0)
  const [windowLogModalOpen, setWindowLogModalOpen] = useState(false)

  const isSelectedToday = useMemo(() => isSameLocalCalendarDay(day, new Date()), [day])
  const selectedDayKind = useMemo(() => compareLocalCalendarDay(day), [day])

  const windowEventsNet = useMemo(
    () => excludeGanshaleSelfWindowEvents(windowEvents),
    [windowEvents],
  )

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
      nameRev,
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

  const sessionElapsedSecRaw = useMemo(
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

  const elapsedFloorRef = useRef<{ ymd: string; sec: number }>({ ymd: '', sec: 0 })
  const todayYmd = day.toDateString()
  if (elapsedFloorRef.current.ymd !== todayYmd) elapsedFloorRef.current = { ymd: todayYmd, sec: 0 }
  elapsedFloorRef.current.sec = Math.max(elapsedFloorRef.current.sec, sessionElapsedSecRaw)
  const sessionElapsedSec = elapsedFloorRef.current.sec

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
        <div
          className={[
            'gs-card relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-2 sm:p-2.5',
            selectedDayKind === 'today'
              ? 'gs-office-duration-card'
              : selectedDayKind === 'past'
                ? 'gs-office-duration-card gs-office-duration-card--past'
                : '',
          ].join(' ')}
        >
          <div className="shrink-0">
            <DashboardSectionTitle
              icon={Timer}
              description={DASHBOARD_SECTION_DESCRIPTIONS.dailyOfficeTotal}
              suffix={
                <CollectionStatusBadge
                  day={day}
                  windowTrackingActive={windowTrackingActive}
                  windowTrackingSupported={windowTrackingSupported}
                />
              }
            >
              今日办公总时长
            </DashboardSectionTitle>
          </div>
          <div
            className={[
              DASHBOARD_TOP_CARD_BODY_CLASS,
              'relative z-[1] items-center justify-center text-center',
            ].join(' ')}
          >
            <OfficeDurationHmsDisplay
              totalSec={sessionElapsedSec}
              live={extrapolateOfficeTotal && selectedDayKind === 'today'}
            />
          </div>
          {selectedDayKind === 'today' ? (
            <p className="pointer-events-none absolute bottom-2 right-2.5 z-[1] text-[11px] tabular-nums text-ganshale-muted sm:bottom-3 sm:right-3">
              {formatDatetimeZhWithWeekday(nowDate)}
            </p>
          ) : selectedDayKind === 'past' ? (
            <p className="pointer-events-none absolute bottom-2 right-2.5 z-[1] text-[11px] text-ganshale-muted sm:bottom-3 sm:right-3">
              {formatOfficeDurationDayFooterZh(day)}
            </p>
          ) : null}
        </div>
        <div className="gs-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          <AppCategoryDistribution day={day} events={allRows} ready={ready} />
        </div>
        <DailyWorkRecordPanel day={day} events={allRows} />
      </section>

      <WorkdayTimeline
        ready={ready}
        patternsCount={patterns.length}
        liveSync={extrapolateOfficeTotal}
        timeline={timeline}
        timelineWorkday={timelineWorkday}
      />

      <section className={DASHBOARD_PAIR_SECTION_CLASS}>
        <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
          <div className={DASHBOARD_PAIR_CARD_HEADER_CLASS}>
            <div className="min-w-0">
              <DashboardSectionTitle
                icon={AppWindow}
                description={DASHBOARD_SECTION_DESCRIPTIONS.dailyWindowLog}
              >
                实时窗口记录
              </DashboardSectionTitle>
            </div>
            <div className={DASHBOARD_HEADER_ACTIONS_ROW_CLASS}>
              <DashboardHeaderActionSlot
                label="查看全部"
                visible={ready && allRows.length > 0}
                onClick={() => setWindowLogModalOpen(true)}
              />
            </div>
          </div>
          <div className={DASHBOARD_PAIR_CARD_BODY_CLASS}>
            <div className={DASHBOARD_PAIR_SCROLL_BODY_CLASS}>
              {!ready ? (
                <p className="flex h-full items-center justify-center text-center text-xs text-ganshale-muted">
                  加载中…
                </p>
              ) : allRows.length === 0 ? (
                <p className="flex h-full items-center justify-center text-center text-xs text-ganshale-muted">
                  {collectionPausedByUser
                    ? '今日已下班，前台采集已暂停。'
                    : windowTrackingActive
                      ? '暂无窗口记录，切换应用后会在此显示。'
                      : '尚未开始采集，请在顶部点击「上班中」。'}
                </p>
              ) : (
                <div className={DASHBOARD_WINDOW_TABLE_FRAME_CLASS}>
                  <div className={DASHBOARD_WINDOW_TABLE_SCROLL_CLASS}>
                    <table className="w-full table-fixed border-collapse text-left">
                      {WINDOW_TABLE_COLGROUP}
                      <WindowTableHead />
                      <WindowEventTableBody rows={windowPreviewRows} liveSegment={liveWindowSegment} />
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gs-card relative flex h-full min-h-0 flex-col overflow-hidden">
          <AppDurationCompare day={day} events={allRows} ready={ready} />
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
