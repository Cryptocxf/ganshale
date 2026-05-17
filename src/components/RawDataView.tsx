import { useCallback, useEffect, useState } from 'react'
import { Download, FolderOpen, RefreshCw } from 'lucide-react'
import { useGanshaleData } from '../context/useGanshaleData'
import type { AwEvent } from '../lib/awTypes'
import * as store from '../lib/idbStore'
import { SECONDARY_PAGE_CONTENT_CLASS } from './dashboardLayout'

export function RawDataView() {
  const { buckets, refresh, exportAll, importFile, ready, eventCount } =
    useGanshaleData()
  const [selected, setSelected] = useState<string | null>(null)
  const [events, setEvents] = useState<AwEvent[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    void (async () => {
      const evs = await store.getAllEventsForBucket(selected)
      if (!cancelled) setEvents(evs)
    })()
    return () => {
      cancelled = true
    }
  }, [selected, eventCount])

  const tableEvents = selected ? events : []

  const onImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setBusy(true)
      setMsg(null)
      try {
        await importFile(file)
        setMsg('导入完成')
        await refresh()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    }
    input.click()
  }, [importFile, refresh])

  return (
    <div className={SECONDARY_PAGE_CONTENT_CLASS}>
      <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => {
              setBusy(true)
              exportAll().finally(() => setBusy(false))
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2 text-xs font-medium text-ganshale-text shadow-sm transition hover:bg-ganshale-page disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            导出
          </button>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={onImport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ganshale-border bg-ganshale-text px-3 py-2 text-xs font-medium text-ganshale-surface transition hover:opacity-90 disabled:opacity-40"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} />
            导入
          </button>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => {
              setBusy(true)
              refresh().finally(() => setBusy(false))
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-2 text-xs font-medium text-ganshale-muted transition hover:text-ganshale-text disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            刷新
          </button>
      </div>

      {msg ? (
        <p className="rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-2 text-sm text-ganshale-muted">
          {msg}
        </p>
      ) : null}

      {!ready ? (
        <p className="text-sm text-ganshale-muted">加载中…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ganshale-subtle">
              Buckets · {buckets.length}
            </p>
            <ul className="max-h-[50vh] space-y-0.5 overflow-auto rounded-xl border border-ganshale-border bg-ganshale-surface p-1.5 shadow-sm">
              {buckets.map((b) => {
                const active = selected === b.id
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(b.id)}
                      className={[
                        'w-full rounded-lg px-2.5 py-2 text-left text-xs transition',
                        active
                          ? 'bg-ganshale-page font-medium text-ganshale-text ring-1 ring-ganshale-border'
                          : 'text-ganshale-muted hover:bg-ganshale-page hover:text-ganshale-text',
                      ].join(' ')}
                    >
                      <span className="block truncate font-mono text-[10px] text-ganshale-text">
                        {b.id}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ganshale-subtle">
                        {b.type}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ganshale-subtle">
              Events {selected ? `· ${tableEvents.length}` : ''}
            </p>
            {!selected ? (
              <div className="rounded-xl border border-dashed border-ganshale-border bg-ganshale-surface px-6 py-12 text-center text-sm text-ganshale-muted">
                选择左侧桶查看事件。
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-auto rounded-xl border border-ganshale-border bg-ganshale-surface shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-ganshale-border bg-ganshale-page">
                    <tr className="text-ganshale-subtle">
                      <th className="px-3 py-2 font-medium">timestamp</th>
                      <th className="px-3 py-2 font-medium">duration</th>
                      <th className="px-3 py-2 font-medium">data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ganshale-border font-mono text-[11px] text-ganshale-text">
                    {tableEvents.map((e) => (
                      <tr key={e.id} className="align-top">
                        <td className="whitespace-nowrap px-3 py-2 text-ganshale-muted">
                          {e.timestamp}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{e.duration}</td>
                        <td className="break-all px-3 py-2 text-ganshale-muted">
                          {JSON.stringify(e.data)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
