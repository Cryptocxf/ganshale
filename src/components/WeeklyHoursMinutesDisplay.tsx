import { formatHoursMinutesZh, splitHoursMinutes } from '../lib/weeklyWorktime'

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0')

type Size = 'lg' | 'md'

const SIZE_CLASS: Record<
  Size,
  { num: string; unit: string; groupGap: string; segmentGap: string }
> = {
  lg: {
    num: 'text-[2rem] font-bold tabular-nums leading-none tracking-tight text-ganshale-text sm:text-[2.125rem]',
    unit: 'text-[15px] font-semibold text-ganshale-text sm:text-base',
    groupGap: 'gap-x-3 sm:gap-x-4',
    segmentGap: 'gap-x-1.5',
  },
  md: {
    num: 'text-[15px] font-bold tabular-nums leading-none text-ganshale-text',
    unit: 'text-[12px] font-semibold text-ganshale-text',
    groupGap: 'gap-x-2.5',
    segmentGap: 'gap-x-1',
  },
}

/** `02小时29分钟`（时分均两位，数字与单位留出间距） */
export function WeeklyHoursMinutesDisplay({
  totalSec,
  size = 'lg',
}: {
  totalSec: number
  size?: Size
}) {
  const { h, m } = splitHoursMinutes(totalSec)
  const c = SIZE_CLASS[size]

  return (
    <p
      className={[
        'flex flex-wrap items-baseline justify-center leading-none',
        c.groupGap,
      ].join(' ')}
      aria-label={formatHoursMinutesZh(totalSec)}
    >
      <span className={['inline-flex items-baseline', c.segmentGap].join(' ')}>
        <span className={c.num}>{pad2(h)}</span>
        <span className={c.unit}>小时</span>
      </span>
      <span className={['inline-flex items-baseline', c.segmentGap].join(' ')}>
        <span className={c.num}>{pad2(m)}</span>
        <span className={c.unit}>分钟</span>
      </span>
    </p>
  )
}
