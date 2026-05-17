import { compareLocalCalendarDay } from '../lib/timeutil'
import { StatusPulseDot } from './StatusPulseDot'

/** 前台采集状态（每日页「今日办公总时长」标题旁） */
export function CollectionStatusBadge({
  day,
  windowTrackingActive,
  windowTrackingSupported,
}: {
  day: Date
  windowTrackingActive: boolean
  windowTrackingSupported: boolean
}) {
  if (!windowTrackingSupported) return null

  const dayKind = compareLocalCalendarDay(day)
  const label =
    dayKind === 'future' ? '未采集' : dayKind === 'past' ? '已完成' : '采集中'
  const live = dayKind === 'today' && windowTrackingActive

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-none',
        live
          ? 'border-emerald-200/90 bg-emerald-50/80 text-emerald-950'
          : 'border-black/[0.06] bg-white/80 text-ganshale-muted',
      ].join(' ')}
      role="status"
      aria-label={label}
    >
      <StatusPulseDot active={live} />
      {label}
    </span>
  )
}
