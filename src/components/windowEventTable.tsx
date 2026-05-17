import type { AwEvent } from '../lib/awTypes'
import { formatDuration } from '../lib/aggregations'
import { formatClock, parseIso } from '../lib/timeutil'
import { AppBrandIcon } from './AppBrandIcon'
import { DASHBOARD_PAIR_ICON_SIZE, DASHBOARD_PAIR_ROW_HEIGHT_PX } from './dashboardLayout'

export const WINDOW_TABLE_MODAL_COLGROUP = (
  <colgroup>
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[11%]" />
    <col className="w-[45%]" />
    <col className="w-[11%]" />
  </colgroup>
)

export function WindowTableHead() {
  const thCell = 'whitespace-nowrap px-2 py-0 text-left text-[11px] font-medium h-7 align-middle'
  return (
    <thead className="sticky top-0 z-[1] border-b border-ganshale-border bg-ganshale-page text-ganshale-subtle">
      <tr className="h-7">
        <th className={thCell} aria-hidden />
        <th className={thCell}>应用</th>
        <th className={thCell}>开始</th>
        <th className={thCell}>结束</th>
        <th className={thCell}>标题 / 窗口</th>
        <th className={thCell}>时长</th>
      </tr>
    </thead>
  )
}

export function WindowEventTableBody({
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
        const appLabel = appRaw.replace(/\.exe$/i, '') || '未知'
        const title = String(ev.data.title ?? '')
        return (
          <tr key={ev.id} className="hover:bg-ganshale-page" style={rowStyle}>
            <td className={td}>
              <AppBrandIcon
                app={appRaw}
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
            <td className={`${td} whitespace-nowrap font-mono tabular-nums text-ganshale-muted`}>
              {formatDuration(durationSec)}
            </td>
          </tr>
        )
      })}
    </tbody>
  )
}
