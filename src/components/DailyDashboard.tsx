// AUTO-GENERATED — edit scripts/write-daily-dashboard.mjs then: npm run gen:dashboard

import { AppWindow, Timer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { officeElapsedForDay } from '../lib/officeElapsed'
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
import {
  addToAppDurationCompareQueue,
  loadAppDurationCompareQueue,
  removeFromAppDurationCompareQueue,
  syncCompareQueueFromWindowEvents,
} from '../lib/appDurationCompareStore'
import { useAppDurationCompareRevision } from '../hooks/useAppDurationCompareRevision'
import { useDashboardClockLive, useDashboardClockMs } from '../hooks/useDashboardClock'
import { useMonotonicOfficeSec } from '../hooks/useMonotonicOfficeSec'
import { DashboardPairPreviewFooter } from './DashboardPairPreviewFooter'
import {
  WindowEventTableBody,
  WindowTableHead,
  WINDOW_TABLE_PREVIEW_COLGROUP,
} from './windowEventTable'
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

export function DailyDashboard() {
  const {
    day,
    windowEvents,
    ready,
    refresh,
    windowTrackingActive,
    windowTrackingSupported,
    windowTrackingPaused,
    windowRecordingHealthy,
    collectionPausedByUser,
    liveForeground,
  } = useGanshaleData()
  const clockMs = useDashboardClockMs()
  const clockLive = useDashboardClockLive()
  const patterns = useMonitoredAppPatterns()
  const nameRev = useAppDisplayNamesRevision()
  const compareRev = useAppDurationCompareRevision()
  const [windowLogModalOpen, setWindowLogModalOpen] = useState(false)

  const compareQueue = useMemo(
    () => loadAppDurationCompareQueue(day),
    [day, compareRev],
  )
  const compareQueueSet = useMemo(() => new Set(compareQueue), [compareQueue])

  const handleAddToCompare = useCallback(
    (identityKey: string) => {
      addToAppDurationCompareQueue(day, identityKey)
    },
    [day],
  )

  const handleRemoveFromCompare = useCallback(
    (identityKey: string) => {
      removeFromAppDurationCompareQueue(day, identityKey)
    },
    [day],
  )

  const isSelectedToday = useMemo(() => isSameLocalCalendarDay(day, new Date()), [day])
  const selectedDayKind = useMemo(() => compareLocalCalendarDay(day), [day])

  const windowEventsNet = useMemo(
    () => excludeGanshaleSelfWindowEvents(windowEvents),
    [windowEvents],
  )

  const rowsMonitored = useMemo(() => {
    if (!patterns.length) return windowEventsNet
    return windowEventsNet.filter((ev) =>
      foregroundMatchesMonitoredPatterns(String(ev.data.app ?? ''), String(ev.data.title ?? ''), patterns),
    )
  }, [windowEventsNet, patterns])

  const officeTotalExtrapolate = isSelectedToday && !windowTrackingPaused
  const officeTimerLive = clockLive && isSelectedToday && !windowTrackingPaused

  const timeline = useMemo(
    () =>
      officeTotalExtrapolate
        ? timelineFromWindowEventsLive(
            day,
            windowEventsNet,
            liveForeground,
            clockMs,
            true,
          )
        : timelineFromWindowEvents(day, rowsMonitored),
    [day, windowEventsNet, rowsMonitored, liveForeground, clockMs, officeTotalExtrapolate, nameRev],
  )
  const timelineWorkday = useMemo(() => workdayTimelineFromSegments(timeline), [timeline])

  const sessionElapsedSec = useMemo(
    () =>
      officeElapsedForDay(day, windowEventsNet, {
        patterns,
        live: liveForeground,
        nowMs: clockMs,
        extrapolateLive: officeTotalExtrapolate,
      }),
    [day, windowEventsNet, patterns, clockMs, liveForeground, officeTotalExtrapolate],
  )

  const displayElapsedSec = useMonotonicOfficeSec(
    sessionElapsedSec,
    isSelectedToday && clockLive,
  )

  useEffect(() => {
    if (!officeTimerLive) return
    persistLiveTodayFrozenSec(displayElapsedSec)
  }, [clockMs, officeTimerLive, displayElapsedSec])

  useEffect(() => {
    if (!ready || !isSelectedToday || !clockLive || windowTrackingPaused) return
    const id = window.setInterval(() => void refresh(), 2500)
    return () => clearInterval(id)
  }, [ready, isSelectedToday, clockLive, windowTrackingPaused, refresh])

  const allRows = useMemo(
    () => [...windowEventsNet].sort((a, b) => parseIso(b.timestamp) - parseIso(a.timestamp)),
    [windowEventsNet],
  )

  useEffect(() => {
    if (!ready) return
    syncCompareQueueFromWindowEvents(day, allRows)
  }, [ready, day, allRows])

  const windowPreviewRows = useMemo(
    () => allRows.slice(0, DASHBOARD_WINDOW_LOG_PREVIEW_ROWS),
    [allRows],
  )
  const showWindowLogFooter = allRows.length > DASHBOARD_WINDOW_LOG_PREVIEW_ROWS

  const liveWindowSegment = useMemo(() => {
    if (!officeTotalExtrapolate) return null
    const { event, seconds } = currentForegroundSegmentLive(
      windowEventsNet,
      liveForeground,
      clockMs,
      true,
    )
    if (!event) return null
    return { eventId: event.id, seconds }
  }, [windowEventsNet, liveForeground, officeTotalExtrapolate, clockMs])

  const nowDate = useMemo(() => new Date(clockMs), [clockMs])

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
                  windowRecordingHealthy={windowRecordingHealthy}
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
              totalSec={displayElapsedSec}
              live={officeTimerLive}
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
        liveSync={officeTimerLive}
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
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className={DASHBOARD_WINDOW_TABLE_SCROLL_CLASS}>
                      <table className="w-full table-fixed border-collapse text-left">
                        {WINDOW_TABLE_PREVIEW_COLGROUP}
                        <WindowTableHead showCompareColumn />
                        <WindowEventTableBody
                          rows={windowPreviewRows}
                          liveSegment={liveWindowSegment}
                          compareQueueSet={compareQueueSet}
                          onAddToCompare={handleAddToCompare}
                        />
                      </table>
                      {showWindowLogFooter ? (
                        <DashboardPairPreviewFooter>
                          仅展示近 {DASHBOARD_WINDOW_LOG_PREVIEW_ROWS}{' '}
                          条记录，点击右上角「查看全部」可查看今日全部记录。
                        </DashboardPairPreviewFooter>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gs-card relative flex h-full min-h-0 flex-col overflow-hidden">
          <AppDurationCompare
            day={day}
            events={allRows}
            ready={ready}
            compareQueue={compareQueue}
            onRemoveFromCompare={handleRemoveFromCompare}
          />
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
