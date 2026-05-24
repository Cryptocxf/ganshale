import type { LiveForegroundSample } from '../lib/liveForeground'

interface TopBarProps {
  title: string
  liveForeground?: LiveForegroundSample | null
  windowTrackingActive?: boolean
}

export function TopBar({
  title,
  liveForeground = null,
  windowTrackingActive = false,
}: TopBarProps) {
  return (
    <header className="border-b border-ganshale-border bg-ganshale-surface px-8 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-lg font-semibold tracking-tight text-ganshale-text">
          {title}
        </h1>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {windowTrackingActive && liveForeground ? (
            <div className="max-w-md min-w-0 rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-2 text-left">
              <p className="truncate font-mono text-[11px] font-medium text-ganshale-text">
                {liveForeground.app}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-ganshale-muted" title={liveForeground.title}>
                {liveForeground.title || '（无标题）'}
              </p>
              <p className="mt-1 font-mono text-[10px] text-ganshale-subtle">
                {liveForeground.capturedAt.slice(11, 19)}
              </p>
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-ganshale-border bg-ganshale-page px-3 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
            <span className="text-xs font-medium text-ganshale-text">
              {windowTrackingActive ? '正在记录' : '记录中'}
            </span>
            <span className="hidden text-xs text-ganshale-subtle sm:inline">·</span>
            <span className="hidden text-xs text-ganshale-subtle sm:inline">仅本地</span>
          </div>
        </div>
      </div>
    </header>
  )
}
