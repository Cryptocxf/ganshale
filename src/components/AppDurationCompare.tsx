import { BarChart3, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  appTotalsForDay,
  appTotalsForWeek,
  formatDurationCompactSec,
  formatDurationPreciseSec,
} from '../lib/aggregations'
import type { AwEvent } from '../lib/awTypes'
import { chartColorFromMap, chartColorMapForApps } from '../lib/appBrandIcons'
import { AppBrandIcon } from './AppBrandIcon'
import { useAppDisplayNamesRevision } from '../hooks/useAppDisplayNamesRevision'
import { EditableAppDisplayName } from './EditableAppDisplayName'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { DashboardHeaderActionSlot } from './DashboardHeaderActionSlot'
import { DashboardModalRoot } from './DashboardModalRoot'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
  DASHBOARD_DURATION_PREVIEW_ROWS,
  DASHBOARD_HEADER_ACTIONS_ROW_CLASS,
  DASHBOARD_DURATION_LIST_FRAME_CLASS,
  DASHBOARD_PAIR_CARD_BODY_CLASS,
  DASHBOARD_PAIR_CARD_HEADER_CLASS,
  DASHBOARD_PAIR_SCROLL_BODY_CLASS,
  DASHBOARD_PAIR_ICON_SIZE,
  DASHBOARD_PAIR_ROW_HEIGHT_PX,
} from './dashboardLayout'

const DEFAULT_PREVIEW_COUNT = DASHBOARD_DURATION_PREVIEW_ROWS

function durationRankClass(rank: number): string {
  if (rank === 1) return 'w-3.5 shrink-0 text-center text-[13px] font-bold tabular-nums text-ganshale-text'
  if (rank === 2) return 'w-3.5 shrink-0 text-center text-[12px] font-bold tabular-nums text-ganshale-text'
  if (rank === 3) return 'w-3.5 shrink-0 text-center text-[11px] font-bold tabular-nums text-ganshale-text'
  return 'w-3.5 shrink-0 text-center text-[10px] tabular-nums text-ganshale-muted'
}

function DurationBarRow({
  rank,
  row,
  maxSeconds,
  color,
}: {
  rank: number
  row: {
    app: string
    displayName: string
    identityKey: string
    appPath?: string
    seconds: number
  }
  maxSeconds: number
  color: string
}) {
  const label = row.displayName || row.app.replace(/\.exe$/i, '') || row.app
  const durationCompact = formatDurationCompactSec(row.seconds)
  const durationPrecise = formatDurationPreciseSec(row.seconds)
  const barPct = maxSeconds > 0 ? (row.seconds / maxSeconds) * 100 : 0
  return (
    <div
      className="flex items-center gap-1.5 px-2"
      style={{ minHeight: DASHBOARD_PAIR_ROW_HEIGHT_PX, height: DASHBOARD_PAIR_ROW_HEIGHT_PX }}
    >
      <span className={durationRankClass(rank)} aria-hidden>
        {rank}
      </span>
      <AppBrandIcon
        app={row.app}
        brandKey={row.identityKey}
        appPath={row.appPath}
        size={DASHBOARD_PAIR_ICON_SIZE}
        className="shrink-0 rounded-md"
      />
      <div className="w-[4.25rem] shrink-0 sm:w-[5rem]">
        <EditableAppDisplayName
          identityKey={row.identityKey}
          displayName={label}
          className="w-full"
        />
      </div>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ganshale-track/90">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.min(100, barPct)}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="w-[3.5rem] shrink-0 truncate text-right font-mono text-[11px] tabular-nums text-ganshale-muted"
        title={durationPrecise}
      >
        {durationCompact}
      </span>
    </div>
  )
}

export function AppDurationCompare({
  day,
  events,
  ready,
  previewCount = DEFAULT_PREVIEW_COUNT,
  weekStartMonday,
}: {
  day: Date
  events: AwEvent[]
  ready: boolean
  previewCount?: number
  weekStartMonday?: Date
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const nameRev = useAppDisplayNamesRevision()
  const rows = useMemo(
    () =>
      weekStartMonday != null
        ? appTotalsForWeek(weekStartMonday, events)
        : appTotalsForDay(day, events),
    [weekStartMonday, day, events, nameRev],
  )
  const maxSeconds = useMemo(() => rows.reduce((m, r) => Math.max(m, r.seconds), 0), [rows])
  const colorMap = useMemo(() => chartColorMapForApps(rows.map((r) => r.identityKey)), [rows])
  const previewRows = rows.slice(0, previewCount)

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className={DASHBOARD_PAIR_CARD_HEADER_CLASS}>
          <div className="min-w-0">
            <DashboardSectionTitle
              icon={BarChart3}
              description={DASHBOARD_SECTION_DESCRIPTIONS.dailyAppDurationCompare}
            >
              应用时长对比
            </DashboardSectionTitle>
          </div>
          <div className={DASHBOARD_HEADER_ACTIONS_ROW_CLASS}>
            <DashboardHeaderActionSlot
              label="查看全部"
              visible={ready && rows.length > 0}
              onClick={() => setModalOpen(true)}
            />
          </div>
        </div>
        <div className={DASHBOARD_PAIR_CARD_BODY_CLASS}>
          <div className={DASHBOARD_PAIR_SCROLL_BODY_CLASS}>
          {!ready ? (
            <p className="flex h-full items-center justify-center text-center text-xs text-ganshale-muted">
              加载中…
            </p>
          ) : rows.length === 0 ? (
            <p className="flex h-full items-center justify-center text-center text-xs text-ganshale-muted">
              暂无窗口数据。
            </p>
          ) : (
            <div className={DASHBOARD_DURATION_LIST_FRAME_CLASS}>
              {previewRows.map((row, index) => (
                <DurationBarRow
                  key={row.identityKey}
                  rank={index + 1}
                  row={row}
                  maxSeconds={maxSeconds}
                  color={chartColorFromMap(colorMap, row.identityKey)}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {modalOpen ? (
        <DashboardModalRoot
          open
          onClose={() => setModalOpen(false)}
          labelledBy="app-duration-modal-title"
          dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
        >
            <div
              className={`flex items-center justify-between px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
            >
              <DashboardSectionTitle id="app-duration-modal-title" icon={BarChart3}>
                应用时长对比
              </DashboardSectionTitle>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
                aria-label="关闭"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className={[DASHBOARD_DETAIL_MODAL_BODY_CLASS, 'divide-y divide-ganshale-border'].join(' ')}>
              {rows.map((row, index) => (
                <DurationBarRow
                  key={row.identityKey}
                  rank={index + 1}
                  row={row}
                  maxSeconds={maxSeconds}
                  color={chartColorFromMap(colorMap, row.identityKey)}
                />
              ))}
            </div>
        </DashboardModalRoot>
      ) : null}
    </>
  )
}
