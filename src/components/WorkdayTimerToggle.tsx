import { Pause, Play } from 'lucide-react'
import { useGanshaleData } from '../context/useGanshaleData'
import { compareLocalCalendarDay } from '../lib/timeutil'

const BTN_H = 'h-11 min-h-11 max-h-11'

/** 顶栏：暂停 / 开始（仅「每日」且所选为今天时显示） */
export function WorkdayTimerToggle({ day }: { day: Date }) {
  const { workdayTimerPausedByUser, toggleWorkdayTimerPause } = useGanshaleData()
  const isToday = compareLocalCalendarDay(day) === 'today'

  if (!isToday) return null

  const paused = workdayTimerPausedByUser

  return (
    <button
      type="button"
      onClick={toggleWorkdayTimerPause}
      className={[
        'gs-toolbar-btn inline-flex shrink-0 items-center gap-1.5 px-3 text-[11px] font-semibold text-white transition',
        BTN_H,
        paused ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
      ].join(' ')}
      aria-pressed={paused}
      aria-label={paused ? '开始' : '暂停'}
    >
      {paused ? (
        <Play className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Pause className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}
      {paused ? '开始' : '暂停'}
    </button>
  )
}
