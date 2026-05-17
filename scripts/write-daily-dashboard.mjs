import fs from 'node:fs'

/** 输出 \\uXXXX 形式，生成文件为纯 ASCII，避免 Windows/编辑器弄坏 UTF-8 */
function cn(str) {
  let out = ''
  for (const ch of str) {
    const cp = ch.codePointAt(0)
    if (cp <= 0x7f) {
      if (ch === "'") out += "\\'"
      else if (ch === '\\') out += '\\\\'
      else out += ch
    } else if (cp <= 0xffff) {
      out += '\\u' + cp.toString(16).padStart(4, '0')
    } else {
      out += '\\u{' + cp.toString(16) + '}'
    }
  }
  return out
}

const content = `import { AppWindow, Timer, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import type { AwEvent } from '../lib/awTypes'
import {
  currentForegroundSegmentLive,
  formatDuration,
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
  formatClock,
  formatDatetimeZhWithWeekday,
  isSameLocalCalendarDay,
  parseIso,
} from '../lib/timeutil'
import { AppBrandIcon } from './AppBrandIcon'
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
  DASHBOARD_PAIR_ICON_SIZE,
  DASHBOARD_PAIR_ROW_HEIGHT_PX,
  DASHBOARD_WINDOW_LOG_PREVIEW_ROWS,
  DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX,
  DASHBOARD_DETAIL_MODAL_SHELL_CLASS,
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_BOTTOM_SECTION_CLASS,
  DASHBOARD_PAIR_SECTION_CLASS,
  DASHBOARD_PAGE_CLASS,
} from './dashboardLayout'
import { WorkdayTimeline, workdayTimelineFromSegments } from './WorkdayTimeline'

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

const WINDOW_TABLE_MODAL_COLGROUP = (
  <colgroup>
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[45%]" />
    <col className="w-[11%]" />
  </colgroup>
)

function WindowTableHead() {
  const thCell = 'whitespace-nowrap px-2 py-0 text-left text-[11px] font-medium h-7 align-middle'
  return (
    <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page text-ganshale-subtle">
      <tr className="h-7">
        <th className={thCell} aria-hidden />
        <th className={thCell}>{'${cn('\u5e94\u7528')}'}</th>
        <th className={thCell}>{'${cn('\u5f00\u59cb')}'}</th>
        <th className={thCell}>{'${cn('\u7ed3\u675f')}'}</th>
        <th className={thCell}>{'${cn('\u6807\u9898 / \u7a97\u53e3')}'}</th>
        <th className={thCell}>{'${cn('\u65f6\u957f')}'}</th>
      </tr>
    </thead>
  )
}

function WindowEventTableBody({
  rows,
  titleLines = 1,
  liveSegment,
}: {
  rows: AwEvent[]
  titleLines?: 1 | 2
  liveSegment?: { eventId: string; seconds: number } | null
}) {
  const rowStyle = { height: DASHBOARD_PAIR_ROW_HEIGHT_PX, minHeight: DASHBOARD_PAIR_ROW_HEIGHT_PX }
  const td = 'px-2 py-0 align-middle text-left text-[11px]'
  const titleClamp = titleLines === 2 ? 'line-clamp-2 break-words' : 'line-clamp-1 break-words'
  return (
    <tbody className="divide-y divide-ganshale-border">
      {rows.map((ev) => {
        const startMs = parseIso(ev.timestamp)
        const isLiveRow = liveSegment != null && ev.id === liveSegment.eventId
        const durationSec = isLiveRow ? liveSegment.seconds : ev.duration
        const t0 = new Date(startMs)
        const t1 = new Date(startMs + Math.max(0, durationSec) * 1000)
        const appRaw = String(ev.data.app ?? '').trim()
        const appPath = String(ev.data.appPath ?? '').trim()
        const appLabel = appRaw.replace(/\\.exe$/i, '') || '${cn('\u672a\u77e5')}'
        const title = String(ev.data.title ?? '')
        return (
          <tr key={ev.id} className="hover:bg-ganshale-page" style={rowStyle}>
            <td className={\`\${td}\`}>
              <AppBrandIcon app={appRaw} appPath={appPath || undefined} size={DASHBOARD_PAIR_ICON_SIZE} className="rounded-md" />
            </td>
            <td className={\`\${td} min-w-0 truncate font-medium text-ganshale-text\`} title={appLabel}>
              {appLabel}
            </td>
            <td className={\`\${td} whitespace-nowrap font-mono text-ganshale-muted\`}>{formatClock(t0)}</td>
            <td className={\`\${td} whitespace-nowrap font-mono text-ganshale-muted\`}>{formatClock(t1)}</td>
            <td className={\`\${td} min-w-0 text-ganshale-muted\`}>
              <span className={\`\${titleClamp}\`} title={title}>
                {title || '${cn('\u2014')}'}
              </span>
            </td>
            <td className={\`\${td} whitespace-nowrap font-mono tabular-nums text-ganshale-muted\`}>
              {formatDuration(durationSec)}
            </td>
          </tr>
        )
      })}
    </tbody>
  )
}

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

  const modalRows = useMemo(() => allRows.slice(0, 40), [allRows])

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
    <motion.div className={DASHBOARD_PAGE_CLASS}>
      <section className={DASHBOARD_BOTTOM_SECTION_CLASS}>
        <motion.div className="gs-card relative flex min-h-0 min-w-0 flex-col justify-center p-2 sm:p-2.5">
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
            {'${cn('\u4eca\u65e5\u529e\u516c\u603b\u65f6\u957f')}'}
          </DashboardSectionTitle>
          <motion.div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-center sm:py-2">
            <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-ganshale-text sm:text-2xl md:text-3xl lg:text-[1.35rem] xl:text-3xl">
              {formatDurationHmsZhFixed(sessionElapsedSec)}
            </p>
            {selectedDayKind === 'past' ? (
              <p className="text-[10px] text-ganshale-muted">{'${cn('\u5df2\u505c\u6b62')}'}</p>
            ) : selectedDayKind === 'future' ? (
              <p className="text-[10px] text-ganshale-muted">{'${cn('\u672a\u5f00\u59cb')}'}</p>
            ) : collectionPausedByUser ? (
              <p className="text-[10px] text-ganshale-muted">
                {'${cn('\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\uff1b\u6b21\u65e5 0 \u70b9\u6216\u70b9\u51fb\u300c\u4e0a\u73ed\u4e2d\u300d\u540e\u7ee7\u7eed\u7d2f\u8ba1\u3002')}'}
              </p>
            ) : extrapolateOfficeTotal ? (
              <p className="max-w-[14rem] text-[10px] leading-snug text-ganshale-muted">
                {'${cn('\u91c7\u96c6\u4e2d\u4e0e\u300c\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55\u300d\u540c\u6b65\u7d2f\u8ba1\u524d\u53f0\u65f6\u957f\u3002')}'}
              </p>
            ) : patterns.length === 0 ? (
              <p className="max-w-[14rem] text-[10px] leading-snug text-amber-800">{'${cn('\u672a\u914d\u7f6e\u76d1\u63a7\u5217\u8868\uff0c\u5f53\u524d\u7edf\u8ba1\u5168\u90e8\u524d\u53f0\u7a97\u53e3\u65f6\u957f\u3002')}'}</p>
            ) : (
              <p className="max-w-[14rem] text-[10px] leading-snug text-ganshale-muted">
                {'${cn('\u4ec5\u7edf\u8ba1\u76d1\u63a7\u5217\u8868\u4e2d\u7684\u5e94\u7528\u524d\u53f0\u65f6\u957f\u3002')}'}
              </p>
            )}
          </motion.div>
          {isSelectedToday ? (
            <p className="pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular-nums text-ganshale-muted sm:bottom-3 sm:right-3">
              {formatDatetimeZhWithWeekday(nowDate)}
            </p>
          ) : null}
        </motion.div>
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
                <DashboardSectionTitle icon={AppWindow}>{'${cn('\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55')}'}</DashboardSectionTitle>
                <DashboardSectionSubtitle>{'${cn('\u8bb0\u5f55\u5168\u90e8\u524d\u53f0\u7a97\u53e3\uff0c\u6309\u5207\u6362\u65f6\u95f4\u5012\u5e8f\u5c55\u793a')}'}</DashboardSectionSubtitle>
              </div>
              {ready && allRows.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setWindowLogModalOpen(true)}
                  className="shrink-0 rounded-md border border-black/[0.08] bg-white px-2 py-0.5 text-[10px] font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page"
                >
                  {'${cn('\u67e5\u770b\u5168\u90e8')}'}
                </button>
              ) : null}
            </div>
            <div className={['min-w-0 overflow-x-hidden', DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_BOTTOM].join(' ')}>
              {!ready ? (
                <p className="py-4 text-center text-xs text-ganshale-muted">{'${cn('\u52a0\u8f7d\u4e2d\u2026')}'}</p>
              ) : allRows.length === 0 ? (
                <p className="py-4 text-center text-xs text-ganshale-muted">
                  {collectionPausedByUser
                    ? '${cn('\u4eca\u65e5\u5df2\u4e0b\u73ed\uff0c\u524d\u53f0\u91c7\u96c6\u5df2\u6682\u505c\u3002')}'
                    : windowTrackingActive
                      ? '${cn('\u6682\u65e0\u7a97\u53e3\u8bb0\u5f55\uff0c\u5207\u6362\u5e94\u7528\u540e\u4f1a\u5728\u6b64\u663e\u793a\u3002')}'
                      : '${cn('\u5c1a\u672a\u5f00\u59cb\u91c7\u96c6\uff0c\u8bf7\u5728\u9876\u90e8\u70b9\u51fb\u300c\u4e0a\u73ed\u4e2d\u300d\u3002')}'}
                </p>
              ) : (
                <motion.div
                  className="overflow-y-auto overflow-x-hidden border-b border-ganshale-border [scrollbar-gutter:stable]"
                  style={{ maxHeight: DASHBOARD_WINDOW_TABLE_SCROLL_MAX_PX }}
                >
                  <table className="w-full table-fixed border-collapse text-left">
                    {WINDOW_TABLE_COLGROUP}
                    <WindowTableHead />
                    <WindowEventTableBody rows={windowPreviewRows} liveSegment={liveWindowSegment} />
                  </table>
                </motion.div>
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

      {windowLogModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setWindowLogModalOpen(false)
          }}
        >
          <div
            className={DASHBOARD_DETAIL_MODAL_SHELL_CLASS}
            role="dialog"
            aria-modal="true"
            aria-labelledby="window-log-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-2 py-1.5 sm:px-3">
              <DashboardSectionTitle id="window-log-modal-title" icon={AppWindow}>
                {'${cn('\u5b9e\u65f6\u7a97\u53e3\u8bb0\u5f55')}'}
              </DashboardSectionTitle>
              <button
                type="button"
                onClick={() => setWindowLogModalOpen(false)}
                className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
                aria-label="${cn('\u5173\u95ed')}"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
              <table className="w-full table-fixed border-collapse text-left">
                {WINDOW_TABLE_MODAL_COLGROUP}
                <WindowTableHead />
                <WindowEventTableBody rows={modalRows} titleLines={2} liveSegment={liveWindowSegment} />
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
`

const header =
  '// AUTO-GENERATED — edit scripts/write-daily-dashboard.mjs then: npm run gen:dashboard\n\n'

const fixed =
  header + content.replaceAll('<motion.div', '<div').replaceAll('</motion.div>', '</div>')

const outPath = 'src/components/DailyDashboard.tsx'
fs.writeFileSync(outPath, fixed, 'utf8')
const hasHan = /[\u4e00-\u9fff]/.test(fixed)
const hasEsc = fixed.includes('\\u5b9e\\u65f6')
console.log('written', outPath, 'unicodeEsc:', hasEsc, 'literalHan:', hasHan)
if (hasHan) {
  console.error('Output must not contain literal Chinese; fix cn() usage.')
  process.exit(1)
}
