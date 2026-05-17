/** 24h strip: relative activity by hour (event starts). */
export function VisualHourHeat({
  bins,
  className = '',
  compact = false,
}: {
  bins: number[]
  className?: string
  compact?: boolean
}) {
  const max = Math.max(1, ...bins)
  const labels = ['0', '6', '12', '18', '24']

  return (
    <div
      className={[
        'gs-card flex h-full min-h-0 flex-col shadow-[0_10px_36px_-22px_rgba(15,23,42,0.1)]',
        compact ? 'p-2.5 md:p-3' : 'p-5 md:p-6',
        className,
      ].join(' ')}
    >
      <div
        className={[
          'flex items-baseline justify-between gap-2',
          compact ? 'mb-1.5' : 'mb-4',
        ].join(' ')}
      >
        <h3
          className={
            compact
              ? 'text-xs font-semibold text-ganshale-text'
              : 'text-sm font-semibold text-ganshale-text'
          }
        >
          今日节奏
        </h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-ganshale-subtle">
          按开始时刻
        </span>
      </div>
      <div
        className={[
          'flex flex-1 items-end justify-between gap-0.5 sm:gap-1',
          compact ? 'min-h-[4.5rem]' : 'h-28',
        ].join(' ')}
      >
        {bins.map((v, h) => {
          const hgt = 8 + (v / max) * 92
          return (
            <div
              key={h}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${h}:00 — ${Math.round(v / 60)} 分钟`}
            >
              <div
                className={[
                  'w-full rounded-t-md bg-gradient-to-t from-zinc-300/90 to-zinc-500/85 transition group-hover:from-sky-300/90 group-hover:to-indigo-500/90',
                  compact ? 'max-w-[10px] sm:max-w-[12px]' : 'max-w-[14px] sm:max-w-[18px]',
                ].join(' ')}
                style={{ height: `${hgt}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between px-0.5 font-mono text-[9px] text-ganshale-subtle sm:text-[10px]">
        {labels.map((lb, i) => (
          <span key={i}>{lb}</span>
        ))}
      </div>
    </div>
  )
}
