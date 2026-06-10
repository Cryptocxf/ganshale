import { useEffect, useRef } from 'react'
import { APP_DATA_CHANGED_EVENT } from '../lib/dataManagement'

/** 切换前台后 raw 可能短暂变小；此时间内保持峰值避免倒退。 */
const PEAK_HOLD_MS = 2500

/**
 * 今日办公总时长展示：切换应用时 raw 可能短暂变小，短期内取峰值避免「倒退」。
 * 超过 {@link PEAK_HOLD_MS} 仍低于峰值则跟随后端数据（避免 IDB 刷新后总时长永久卡住）。
 */
export function useMonotonicOfficeSec(rawSec: number, enabled: boolean): number {
  const peakRef = useRef(0)
  const lastPeakAtMsRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      peakRef.current = 0
      lastPeakAtMsRef.current = 0
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const reset = () => {
      peakRef.current = 0
      lastPeakAtMsRef.current = 0
    }
    window.addEventListener(APP_DATA_CHANGED_EVENT, reset)
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, reset)
  }, [enabled])

  if (!enabled) return rawSec

  const raw = Math.max(0, Math.floor(rawSec))
  const now = Date.now()

  if (raw >= peakRef.current) {
    peakRef.current = raw
    lastPeakAtMsRef.current = now
  } else if (now - lastPeakAtMsRef.current >= PEAK_HOLD_MS) {
    peakRef.current = raw
    lastPeakAtMsRef.current = now
  }

  return peakRef.current
}
