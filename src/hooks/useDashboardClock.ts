import { useEffect, useState } from 'react'

/** 每秒刷新，供办公总时长、时间轴等 live 计算使用。 */
export function useDashboardClockMs(): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  void tick
  return Date.now()
}

export function useDashboardClockLive(): boolean {
  return true
}
