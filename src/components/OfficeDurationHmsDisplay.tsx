const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0')

function splitHms(totalSec: number): { h: number; m: number; s: number } {
  const s0 = Math.max(0, Math.round(totalSec))
  return {
    h: Math.floor(s0 / 3600),
    m: Math.floor((s0 % 3600) / 60),
    s: s0 % 60,
  }
}

/** 今日办公总时长：核心数字加大加粗，单位「小时/分钟/秒」 */
export function OfficeDurationHmsDisplay({
  totalSec,
  live = false,
  size = 'default',
}: {
  totalSec: number
  /** 正在记录时数字区略强调 */
  live?: boolean
  size?: 'default' | 'sm'
}) {
  const { h, m, s } = splitHms(totalSec)
  const numCls = [
    'gs-duration-num',
    size === 'sm' ? 'gs-duration-num--sm' : '',
    live ? 'gs-duration-num--live' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const unitCls = [
    'ml-0.5 align-baseline font-medium tracking-normal text-ganshale-muted',
    size === 'sm' ? 'text-[11px]' : 'text-[13px]',
  ].join(' ')

  return (
    <p
      className={[
        'flex flex-wrap items-baseline justify-center gap-y-0.5',
        size === 'sm' ? 'gap-x-2' : 'gap-x-3',
      ].join(' ')}
      aria-label={`${h}小时${m}分钟${s}秒`}
    >
      <span className="inline-flex items-baseline">
        <span className={numCls}>{pad2(h)}</span>
        <span className={unitCls}>小时</span>
      </span>
      <span className="inline-flex items-baseline">
        <span className={numCls}>{pad2(m)}</span>
        <span className={unitCls}>分钟</span>
      </span>
      <span className="inline-flex items-baseline">
        <span className={numCls}>{pad2(s)}</span>
        <span className={unitCls}>秒</span>
      </span>
    </p>
  )
}
