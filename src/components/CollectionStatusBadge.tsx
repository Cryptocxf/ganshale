import { compareLocalCalendarDay } from '../lib/timeutil'
import { StatusPulseDot } from './StatusPulseDot'

/** 前台采集状态（每日页「今日办公总时长」标题旁） */
export function CollectionStatusBadge({
  day,
  windowTrackingActive,
  windowTrackingSupported,
  windowRecordingHealthy = true,
}: {
  day: Date
  windowTrackingActive: boolean
  windowTrackingSupported: boolean
  windowRecordingHealthy?: boolean
}) {
  if (!windowTrackingSupported) return null

  const dayKind = compareLocalCalendarDay(day)
  let label: string
  let tone: 'live' | 'stale' | 'muted' = 'muted'

  if (dayKind === 'future') {
    label = '未开始'
  } else if (dayKind === 'past') {
    label = '已完成'
  } else if (!windowTrackingActive) {
    label = '未采集'
  } else if (!windowRecordingHealthy) {
    label = '采集中断'
    tone = 'stale'
  } else {
    label = '正在记录'
    tone = 'live'
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide',
        tone === 'live'
          ? 'border-cyan-500/30 bg-cyan-500/10 font-mono text-cyan-700'
          : tone === 'stale'
            ? 'border-amber-500/40 bg-amber-500/10 font-mono text-amber-800'
            : 'border-slate-200 bg-white/90 text-ganshale-muted',
      ].join(' ')}
      role="status"
      aria-label={label}
      title={
        tone === 'stale'
          ? '前台轮询或窗口写库已超过一段时间无响应，已尝试自动恢复采集'
          : undefined
      }
    >
      <StatusPulseDot active={tone === 'live'} />
      {label}
    </span>
  )
}
