import { BarChart3, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { appTotalsForDay, formatDurationPreciseSec } from '../lib/aggregations'
import type { AwEvent } from '../lib/awTypes'
import { chartColorFromMap, chartColorMapForApps } from '../lib/appBrandIcons'
import { AppBrandIcon } from './AppBrandIcon'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_CARD_INSET_BOTTOM,
  DASHBOARD_CARD_INSET_X,
  DASHBOARD_CARD_INSET_TOP,
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SHELL_CLASS,
  DASHBOARD_DURATION_BODY_MAX_PX,
  DASHBOARD_DURATION_PREVIEW_ROWS,
  DASHBOARD_PAIR_ICON_SIZE,
  DASHBOARD_PAIR_ROW_HEIGHT_PX,
} from './dashboardLayout'

const DEFAULT_PREVIEW_COUNT = DASHBOARD_DURATION_PREVIEW_ROWS

function DurationBarRow({
  row,
  maxSeconds,
  color,
}: {
  row: { app: string; appPath?: string; seconds: number }
  maxSeconds: number
  color: string
}) {
  const label = row.app.replace(/\.exe$/i, '') || row.app
  const durationLabel = formatDurationPreciseSec(row.seconds)
  const durationHasHour = row.seconds >= 3600
  const barPct = maxSeconds > 0 ? (row.seconds / maxSeconds) * 100 : 0
  return (
    <div
      className="flex items-center gap-2.5 px-2"
      style={{ minHeight: DASHBOARD_PAIR_ROW_HEIGHT_PX, height: DASHBOARD_PAIR_ROW_HEIGHT_PX }}
    >
      <AppBrandIcon
        app={row.app}
        appPath={row.appPath}
        size={DASHBOARD_PAIR_ICON_SIZE}
        className="shrink-0 rounded-md"
      />
      <span
        className="w-[5.5rem] shrink-0 truncate text-[11px] font-medium text-ganshale-text sm:w-[6.5rem]"
        title={label}
      >
        {label}
      </span>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ganshale-track/90">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.min(100, barPct)}%`, backgroundColor: color }}
        />
      </div>
      <span
        className={[
          'w-[3.25rem] shrink-0 truncate text-right font-mono tabular-nums text-ganshale-muted',
          durationHasHour ? 'text-[9px] leading-none' : 'text-[11px]',
        ].join(' ')}
        title={durationLabel}
      >
        {durationLabel}
      </span>
    </div>
  )
}

export function AppDurationCompare({
  day,
  events,
  ready,
  previewCount = DEFAULT_PREVIEW_COUNT,
}: {
  day: Date
  events: AwEvent[]
  ready: boolean
  previewCount?: number
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const rows = useMemo(() => appTotalsForDay(day, events), [day, events])
  const maxSeconds = useMemo(() => rows.reduce((m, r) => Math.max(m, r.seconds), 0), [rows])
  const colorMap = useMemo(() => chartColorMapForApps(rows.map((r) => r.app)), [rows])
  const previewRows = rows.slice(0, previewCount)

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div
          className={[
            'flex shrink-0 items-start justify-between gap-2 border-b border-black/[0.06]',
            DASHBOARD_CARD_INSET_X,
            DASHBOARD_CARD_INSET_TOP,
            'pb-2',
          ].join(' ')}
        >
          <div className="min-w-0">
            <DashboardSectionTitle icon={BarChart3}>应用时长对比</DashboardSectionTitle>
            <DashboardSectionSubtitle>
              各应用一色且与时间分布一致；条长按最长应用为 100% 等比缩放。
            </DashboardSectionSubtitle>
          </div>
          {ready && rows.length > 0 ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="shrink-0 rounded-md border border-black/[0.08] bg-white px-2 py-0.5 text-[10px] font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page"
            >
              查看全部
            </button>
          ) : null}
        </div>
        <div className={[DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_BOTTOM, 'min-h-0 flex-1'].join(' ')}>
          {!ready ? (
            <p className="py-4 text-center text-xs text-ganshale-muted">加载中…</p>
          ) : rows.length === 0 ? (
            <p className="py-4 text-center text-xs text-ganshale-muted">暂无窗口数据。</p>
          ) : (
            <div
              className="divide-y divide-ganshale-border overflow-y-auto overflow-x-hidden border-b border-ganshale-border pr-0.5"
              style={{
                minHeight: DASHBOARD_DURATION_BODY_MAX_PX,
                maxHeight: DASHBOARD_DURATION_BODY_MAX_PX,
              }}
            >
              {previewRows.map((row) => (
                <DurationBarRow
                  key={row.app}
                  row={row}
                  maxSeconds={maxSeconds}
                  color={chartColorFromMap(colorMap, row.app)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            className={DASHBOARD_DETAIL_MODAL_SHELL_CLASS}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-duration-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-2 py-1.5 sm:px-3">
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
              {rows.map((row) => (
                <DurationBarRow
                  key={row.app}
                  row={row}
                  maxSeconds={maxSeconds}
                  color={chartColorFromMap(colorMap, row.app)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
