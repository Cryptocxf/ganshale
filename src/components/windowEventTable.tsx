import type { AwEvent } from '../lib/awTypes'
import { formatDuration } from '../lib/aggregations'
import { identityFromEventData } from '../lib/windowAppDisplay'
import { formatClock, parseIso } from '../lib/timeutil'
import { AppBrandIcon } from './AppBrandIcon'
import { DASHBOARD_PAIR_ICON_SIZE, DASHBOARD_PAIR_ROW_HEIGHT_PX } from './dashboardLayout'

export const WINDOW_TABLE_MODAL_COLGROUP = (
  <colgroup>
    <col className="w-[6%]" />
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[43%]" />
    <col className="w-[16%]" />
  </colgroup>
)

/** 日看板预览：图标列固定宽度，标题列略窄以免与应用列重叠 */
export const WINDOW_TABLE_PREVIEW_COLGROUP = (
  <colgroup>
    <col className="w-[6%]" />
    <col className="w-[10%]" />
    <col className="w-[10%]" />
    <col className="w-[10%]" />
    <col className="w-[35%]" />
    <col className="w-[10%]" />
    <col className="w-[10%]" />
  </colgroup>
)

const WINDOW_TABLE_BODY_INSET_CLASS = 'pl-2 sm:pl-2.5'
const thCompact =
  'whitespace-nowrap px-1 py-0 text-left text-[11px] font-medium h-7 align-middle sm:px-1.5'
const tdCompact = 'whitespace-nowrap px-1 py-0 align-middle text-left text-[11px] sm:px-1.5'

export function WindowTableHead({ showCompareColumn = false }: { showCompareColumn?: boolean }) {
  return (
    <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page text-ganshale-subtle">
      <tr className="h-7">
        <th className={`${thCompact} ${WINDOW_TABLE_BODY_INSET_CLASS}`} aria-hidden />
        <th className={thCompact}>应用</th>
        <th className={thCompact}>开始</th>
        <th className={thCompact}>结束</th>
        <th className={`${thCompact} min-w-0`}>标题 / 窗口</th>
        <th className={thCompact}>时长</th>
        {showCompareColumn ? <th className={`${thCompact} text-center`}>时长对比</th> : null}
      </tr>
    </thead>
  )
}

export function WindowEventTableBody({
  rows,
  titleLines = 1,
  liveSegment,
  compareQueueSet,
  onAddToCompare,
}: {
  rows: AwEvent[]
  titleLines?: 1 | 2
  liveSegment?: { eventId: string; seconds: number } | null
  compareQueueSet?: ReadonlySet<string>
  onAddToCompare?: (identityKey: string) => void
}) {
  const rowStyle = { height: DASHBOARD_PAIR_ROW_HEIGHT_PX, minHeight: DASHBOARD_PAIR_ROW_HEIGHT_PX }
  const td = tdCompact
  const titleClamp = titleLines === 2 ? 'line-clamp-2 break-words' : 'line-clamp-1 truncate'
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
        const appLabel =
          identityFromEventData(ev.data).displayName || appRaw.replace(/\.exe$/i, '') || '未知'
        const title = String(ev.data.title ?? '')
        const identityKey = identityFromEventData(ev.data).identityKey
        const inCompare = compareQueueSet?.has(identityKey) ?? false
        return (
          <tr key={ev.id} className="hover:bg-ganshale-page" style={rowStyle}>
            <td className={`${td} ${WINDOW_TABLE_BODY_INSET_CLASS}`}>
              <AppBrandIcon
                app={appRaw}
                brandKey={identityFromEventData(ev.data).identityKey}
                appPath={appPath || undefined}
                size={DASHBOARD_PAIR_ICON_SIZE}
                className="rounded-md"
              />
            </td>
            <td className={`${td} min-w-0 truncate font-medium text-ganshale-text`} title={appLabel}>
              {appLabel}
            </td>
            <td className={`${td} whitespace-nowrap font-mono text-ganshale-muted`}>
              {formatClock(t0)}
            </td>
            <td className={`${td} whitespace-nowrap font-mono text-ganshale-muted`}>
              {formatClock(t1)}
            </td>
            <td className={`${td} min-w-0 text-ganshale-muted`}>
              <span className={titleClamp} title={title}>
                {title || '—'}
              </span>
            </td>
            <td className={`${td} font-mono tabular-nums text-ganshale-muted`}>
              {formatDuration(durationSec)}
            </td>
            {compareQueueSet != null ? (
              <td className={`${td} text-center`}>
                {inCompare ? (
                  <span className="text-[10px] font-medium text-ganshale-subtle">已添加</span>
                ) : (
                  <button
                    type="button"
                    className="text-[10px] font-medium text-blue-700 transition hover:text-blue-900"
                    onClick={() => onAddToCompare?.(identityKey)}
                  >
                    添加
                  </button>
                )}
              </td>
            ) : null}
          </tr>
        )
      })}
    </tbody>
  )
}
