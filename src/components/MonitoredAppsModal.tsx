import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useGanshaleData } from '../context/useGanshaleData'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'
import {
  foregroundMatchesMonitoredPatterns,
  loadMonitoredAppPatterns,
  saveMonitoredAppPatterns,
} from '../lib/monitoredAppsStore'
import { uniqueAppsFromWindowEvents } from '../lib/windowAppsFromEvents'
import { AppBrandIcon } from './AppBrandIcon'

const tileGridClass =
  'grid grid-cols-5 gap-x-2 gap-y-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'

function SeenAppTile({
  app,
  appPath,
  label,
  selected,
  onToggle,
}: {
  app: string
  appPath?: string
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={selected ? `取消监控：${label}` : `加入监控：${label}`}
      className={[
        'flex min-w-0 flex-col items-center gap-1 rounded-lg p-1 text-center transition',
        selected
          ? 'bg-ganshale-page/90 ring-2 ring-zinc-800/25'
          : 'hover:bg-ganshale-page/80 active:scale-[0.98]',
      ].join(' ')}
    >
      <AppBrandIcon
        app={app}
        appPath={appPath}
        size={44}
        className="rounded-xl shadow-sm ring-1 ring-black/[0.08]"
      />
      <span className="line-clamp-2 w-full max-w-[5.5rem] break-words text-[10px] leading-tight text-ganshale-text">
        {label}
      </span>
      <span className="text-[9px] text-ganshale-subtle">{selected ? '已监控' : '点击加入'}</span>
    </button>
  )
}

export function MonitoredAppsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { windowEventsToday, ready } = useGanshaleData()
  const [draft, setDraft] = useState<string[]>([])

  const seenApps = useMemo(() => {
    const net = excludeGanshaleSelfWindowEvents(windowEventsToday)
    return uniqueAppsFromWindowEvents(net)
  }, [windowEventsToday])

  useEffect(() => {
    if (!open) return
    setDraft(loadMonitoredAppPatterns())
  }, [open])

  if (!open) return null

  const isSelected = (app: string, patternHint: string) =>
    draft.some(
      (p) =>
        p.toLowerCase() === patternHint.toLowerCase() ||
        foregroundMatchesMonitoredPatterns(app, '', [p]),
    )

  const toggleApp = (app: string, patternHint: string) => {
    if (isSelected(app, patternHint)) {
      setDraft((prev) =>
        prev.filter(
          (p) =>
            p.toLowerCase() !== patternHint.toLowerCase() &&
            !foregroundMatchesMonitoredPatterns(app, '', [p]),
        ),
      )
      return
    }
    setDraft((prev) => {
      if (prev.some((p) => p.toLowerCase() === patternHint.toLowerCase())) return prev
      return [...prev, patternHint]
    })
  }

  const save = () => {
    saveMonitoredAppPatterns(draft)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col rounded-xl border border-black/[0.08] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitored-apps-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2 sm:px-4">
          <h2
            id="monitored-apps-modal-title"
            className="font-display text-sm font-semibold leading-snug text-ganshale-text"
          >
            应用监控列表
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {!ready ? (
            <p className="py-8 text-center text-xs text-ganshale-muted">加载中…</p>
          ) : seenApps.length === 0 ? (
            <p className="py-8 text-center text-xs leading-relaxed text-ganshale-muted">
              今日「实时窗口记录」中还没有应用。先切换几个前台窗口，再打开本列表选择要计入打工时长的应用。
            </p>
          ) : (
            <div className={`rounded-xl border border-black/[0.08] bg-ganshale-page/30 p-3 ${tileGridClass}`}>
              {seenApps.map((item) => (
                <SeenAppTile
                  key={`${item.appPath ?? ''}:${item.app}`}
                  app={item.app}
                  appPath={item.appPath}
                  label={item.label}
                  selected={isSelected(item.app, item.patternHint)}
                  onToggle={() => toggleApp(item.app, item.patternHint)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-black/[0.06] px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-medium text-ganshale-muted shadow-sm transition hover:bg-ganshale-page hover:text-ganshale-text"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
