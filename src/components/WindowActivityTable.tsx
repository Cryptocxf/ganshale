import { AppBrandIcon } from './AppBrandIcon'
import { useGanshaleData } from '../context/useGanshaleData'
import { formatClock, parseIso } from '../lib/timeutil'
import { formatDuration } from '../lib/aggregations'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'

/** 今日窗口桶：时间、应用、标题/内容、停留时长（与 ActivityWatch currentwindow 一致）。 */
export function WindowActivityTable({ compact = false }: { compact?: boolean }) {
  const { windowEvents, ready } = useGanshaleData()

  const maxRows = compact ? 6 : 50
  const rows = [...excludeGanshaleSelfWindowEvents(windowEvents)]
    .sort((a, b) => parseIso(b.timestamp) - parseIso(a.timestamp))
    .slice(0, maxRows)

  return (
    <section className={compact ? 'flex min-h-0 flex-1 flex-col' : ''}>
      <div className={compact ? 'mb-1.5' : 'mb-3'}>
        <h2
          className={
            compact
              ? 'font-display text-xs font-semibold text-ganshale-text'
              : 'font-display text-base font-semibold text-ganshale-text'
          }
        >
          今日窗口记录
        </h2>
        {!compact ? (
          <p className="mt-1 text-xs text-ganshale-muted">
            应用名 · 窗口标题 · 开始时间 · 本条时长（桌面端由前台轮询写入）
          </p>
        ) : null}
      </div>

      <div
        className={[
          'overflow-hidden rounded-3xl border border-black/[0.06] bg-white/85 shadow-sm',
          compact ? 'flex min-h-0 flex-1 flex-col rounded-2xl' : '',
        ].join(' ')}
      >
        {!ready ? (
          <p
            className={[
              'text-center text-sm text-ganshale-muted',
              compact ? 'px-3 py-4' : 'px-4 py-8',
            ].join(' ')}
          >
            加载中…
          </p>
        ) : rows.length === 0 ? (
          <p
            className={[
              'text-center text-sm text-ganshale-muted',
              compact ? 'px-3 py-4' : 'px-4 py-8',
            ].join(' ')}
          >
            暂无记录
          </p>
        ) : (
          <div
            className={compact ? 'min-h-0 overflow-hidden' : 'max-h-[420px] overflow-auto'}
          >
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-ganshale-border bg-ganshale-page text-[11px] uppercase tracking-wide text-ganshale-subtle">
                <tr>
                  <th
                    className={`w-10 px-2 font-medium ${compact ? 'py-1.5' : 'py-2.5'}`}
                    aria-hidden
                  />
                  <th className={`px-3 font-medium ${compact ? 'py-1.5' : 'py-2.5'}`}>时间</th>
                  <th className={`px-3 font-medium ${compact ? 'py-1.5' : 'py-2.5'}`}>应用</th>
                  <th className={`px-3 font-medium ${compact ? 'py-1.5' : 'py-2.5'}`}>标题 / 内容</th>
                  <th
                    className={`hidden px-3 font-medium sm:table-cell ${compact ? 'py-1.5' : 'py-2.5'}`}
                  >
                    时长
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ganshale-border">
                {rows.map((ev) => {
                  const t = new Date(parseIso(ev.timestamp))
                  const appRaw = String(ev.data.app ?? '').trim()
                  const appPath = String(ev.data.appPath ?? '').trim()
                  const appLabel = appRaw || '—'
                  const title = String(ev.data.title ?? '')
                  const iconSize = compact ? 22 : 28
                  const cellY = compact ? 'py-1.5' : 'py-2'
                  return (
                    <tr key={ev.id} className="hover:bg-ganshale-page">
                      <td className={`px-2 align-middle ${cellY}`}>
                        <AppBrandIcon
                          app={appRaw}
                          appPath={appPath || undefined}
                          size={iconSize}
                          className="rounded-lg"
                        />
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 font-mono text-[11px] text-ganshale-muted ${cellY}`}
                      >
                        {formatClock(t)}
                      </td>
                      <td
                        className={`max-w-[140px] truncate px-3 font-mono text-ganshale-text ${compact ? 'text-[11px]' : 'text-xs'} ${cellY}`}
                      >
                        {appLabel}
                      </td>
                      <td className={`max-w-0 px-3 text-ganshale-muted ${compact ? 'text-[11px]' : 'text-xs'} ${cellY}`}>
                        <span className="line-clamp-2 break-words">{title || '—'}</span>
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-3 text-ganshale-subtle sm:table-cell ${compact ? 'text-[11px]' : 'text-xs'} ${cellY}`}
                      >
                        {formatDuration(ev.duration)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
