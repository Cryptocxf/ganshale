import { AppBrandIcon } from './AppBrandIcon'
import { useGanshaleData } from '../context/useGanshaleData'
import { appTotalsForDay, formatDuration } from '../lib/aggregations'
import { brandOrNeutralHex } from '../lib/appBrandIcons'

export function AppsView() {
  const { day, windowEvents, ready } = useGanshaleData()
  const rows = appTotalsForDay(day, windowEvents)

  return (
    <div className="space-y-5 py-8">
      <div>
        <h2 className="font-display text-base font-semibold text-ganshale-text">
          应用时长
        </h2>
        <p className="mt-1 text-xs text-ganshale-muted">按应用名聚合当日窗口停留</p>
      </div>

      {!ready ? (
        <p className="text-sm text-ganshale-muted">加载中…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ganshale-border bg-ganshale-surface px-6 py-12 text-center text-sm text-ganshale-muted">
          暂无数据。
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ganshale-border bg-ganshale-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ganshale-border bg-ganshale-page text-[11px] uppercase tracking-wide text-ganshale-subtle">
              <tr>
                <th className="w-12 px-3 py-3 font-medium" aria-hidden />
                <th className="px-4 py-3 font-medium">应用</th>
                <th className="px-4 py-3 font-medium">时长</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ganshale-border">
              {rows.map((r) => {
                const max = rows[0]?.seconds ?? 1
                const pct = Math.round((r.seconds / max) * 100)
                return (
                  <tr key={r.identityKey} className="hover:bg-ganshale-page">
                    <td className="px-3 py-3 align-middle">
                      <AppBrandIcon
                        app={r.app}
                        brandKey={r.identityKey}
                        appPath={r.appPath}
                        size={32}
                        className="rounded-lg"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-ganshale-text">
                      {r.displayName}
                    </td>
                    <td className="px-4 py-3 text-ganshale-muted">
                      {formatDuration(r.seconds)}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ganshale-track">
                        <div
                          className="h-full rounded-full opacity-90"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: brandOrNeutralHex(r.identityKey),
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
