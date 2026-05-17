import { AppBrandIcon } from '../AppBrandIcon'
import { brandOrNeutralHex } from '../../lib/appBrandIcons'

interface Slice {
  appKey: string
  appPath?: string
  label: string
  seconds: number
  color: string
}

function buildSlices(
  rows: { app: string; seconds: number; appPath?: string }[],
  maxSlices = 6,
): Slice[] {
  if (rows.length === 0) return []
  const head = rows.slice(0, maxSlices).map((r) => ({
    appKey: r.app,
    appPath: r.appPath,
    label: r.app.replace(/\.exe$/i, ''),
    seconds: r.seconds,
    color: brandOrNeutralHex(r.app),
  }))
  const rest = rows.slice(maxSlices)
  if (rest.length === 0) return head
  const otherSec = rest.reduce((s, r) => s + r.seconds, 0)
  if (otherSec <= 0) return head
  return [
    ...head,
    {
      appKey: '',
      label: '其他',
      seconds: otherSec,
      color: '#d4d4d8',
    },
  ]
}

/** Conic-gradient donut + legend — app share of screen time. */
export function VisualAppDonut({
  rows,
  className = '',
  compact = false,
}: {
  rows: { app: string; seconds: number; appPath?: string }[]
  className?: string
  compact?: boolean
}) {
  const slices = buildSlices(rows)
  const total = slices.reduce((s, x) => s + x.seconds, 0)
  if (total <= 0) {
    return (
      <div
        className={[
          'flex flex-col items-center justify-center rounded-xl border border-dashed border-ganshale-border bg-white/60 text-center text-sm text-ganshale-muted',
          compact
            ? 'aspect-auto min-h-[7rem] p-3'
            : 'aspect-square max-h-[220px] min-h-[160px] p-6',
          className,
        ].join(' ')}
      >
        暂无应用分布数据
      </div>
    )
  }

  let acc = 0
  const parts: string[] = []
  for (const sl of slices) {
    const p = (sl.seconds / total) * 100
    const start = acc
    acc += p
    parts.push(`${sl.color} ${start.toFixed(3)}% ${acc.toFixed(3)}%`)
  }
  const gradient = `conic-gradient(from -90deg, ${parts.join(', ')})`

  return (
    <div
      className={[
        'gs-card flex shadow-[0_10px_36px_-22px_rgba(15,23,42,0.11)]',
        compact
          ? 'h-full min-h-0 flex-col gap-2 p-2.5 md:flex-row md:items-center md:gap-3 md:p-3'
          : 'flex-col gap-5 p-5 md:flex-row md:items-center md:gap-8 md:p-6',
        className,
      ].join(' ')}
    >
      <div className="relative mx-auto shrink-0 md:mx-0">
        <div
          className={[
            'aspect-square rounded-full shadow-inner ring-1 ring-black/[0.06]',
            compact ? 'w-[min(100%,6.75rem)]' : 'w-[min(100%,11rem)]',
          ].join(' ')}
          style={{ background: gradient }}
        />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white/95 text-center shadow-sm ring-1 ring-black/[0.05]">
          <span
            className={[
              'font-medium uppercase tracking-wider text-ganshale-subtle',
              compact ? 'text-[9px]' : 'text-[10px]',
            ].join(' ')}
          >
            应用占比
          </span>
          <span
            className={[
              'font-display font-semibold tabular-nums text-ganshale-text',
              compact ? 'mt-0 text-sm' : 'mt-0.5 text-lg',
            ].join(' ')}
          >
            {rows.length}
          </span>
          <span className={compact ? 'text-[9px] text-ganshale-muted' : 'text-[10px] text-ganshale-muted'}>
            项
          </span>
        </div>
      </div>
      <ul className={compact ? 'min-w-0 flex-1 space-y-1' : 'min-w-0 flex-1 space-y-2.5'}>
        {slices.map((sl) => (
          <li
            key={sl.appKey || sl.label}
            className={[
              'flex items-center justify-between gap-2',
              compact ? 'text-[11px]' : 'text-[12px]',
            ].join(' ')}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {sl.appKey ? (
                <AppBrandIcon
                  app={sl.appKey}
                  appPath={sl.appPath}
                  size={compact ? 16 : 20}
                  className="rounded-md"
                />
              ) : (
                <span
                  className={[
                    'inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-100 font-semibold text-zinc-500 ring-1 ring-black/[0.06]',
                    compact ? 'h-4 w-4 text-[8px]' : 'h-5 w-5 text-[10px]',
                  ].join(' ')}
                  title="其他应用"
                >
                  ···
                </span>
              )}
              <span className="truncate font-medium text-ganshale-text">{sl.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ganshale-muted">
              {Math.round((sl.seconds / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
