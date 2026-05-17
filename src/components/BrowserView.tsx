import { useGanshaleData } from '../context/useGanshaleData'
import { browserTotalsForDay, formatDuration } from '../lib/aggregations'

export function BrowserView() {
  const { day, webEvents, ready } = useGanshaleData()
  const rows = browserTotalsForDay(day, webEvents)

  return (
    <div className="space-y-5 py-8">
      <div>
        <h2 className="font-display text-base font-semibold text-ganshale-text">
          站点停留
        </h2>
        <p className="mt-1 text-xs text-ganshale-muted">按域名聚合（演示数据）</p>
      </div>

      {!ready ? (
        <p className="text-sm text-ganshale-muted">加载中…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ganshale-border bg-ganshale-surface px-6 py-12 text-center text-sm text-ganshale-muted">
          暂无浏览记录。
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.host}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ganshale-border bg-ganshale-surface px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-ganshale-text">{r.host}</p>
                {r.sampleTitle ? (
                  <p className="mt-0.5 truncate text-xs text-ganshale-muted">
                    {r.sampleTitle}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-md border border-ganshale-border bg-ganshale-page px-2 py-0.5 text-[11px] text-ganshale-muted">
                {formatDuration(r.seconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
