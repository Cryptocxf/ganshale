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
    dayKind === 'future' ? '未开始' : dayKind === 'past' ? '已完成' : '正在记录'
  const live = dayKind === 'today' && windowTrackingActive

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide',
        live
          ? 'border-cyan-500/30 bg-cyan-500/10 font-mono text-cyan-700'
          : 'border-slate-200 bg-white/90 text-ganshale-muted',
      ].join(' ')}
      role="status"
      aria-label={label}
    >
      <StatusPulseDot active={live} />
      {label}
    </span>
  )
}
