import { useEffect, useState } from 'react'

/** 每秒刷新，供办公总时长、时间轴等 live 计算使用。 */
export function useDashboardClockMs(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

export function useDashboardClockLive(): boolean {
  return true
}
