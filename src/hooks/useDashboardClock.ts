import { useEffect, useState } from 'react'
import { useGanshaleData } from '../context/useGanshaleData'

/** 暂停时返回点击暂停的时刻；否则随秒刷新（用于办公总时长、时间轴等 live 计算）。 */
export function useDashboardClockMs(): number {
  const { workdayTimerPausedByUser, timerPausedAtMs } = useGanshaleData()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (workdayTimerPausedByUser) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [workdayTimerPausedByUser])

  void tick
  if (workdayTimerPausedByUser && timerPausedAtMs != null) return timerPausedAtMs
  return Date.now()
}

export function useDashboardClockLive(): boolean {
  const { workdayTimerPausedByUser } = useGanshaleData()
  return !workdayTimerPausedByUser
}
