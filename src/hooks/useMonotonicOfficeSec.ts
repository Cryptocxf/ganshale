import { useEffect, useRef } from 'react'
import { APP_DATA_CHANGED_EVENT } from '../lib/dataManagement'

/**
 * 今日办公总时长展示：同一自然日、同一会话内严格单调递增。
 * IndexedDB 并发读取可能短暂返回旧快照，但累计时间不应因此倒退。
 * 明确的数据变更会触发 APP_DATA_CHANGED_EVENT，此时允许从数据源重算。
 */
export function useMonotonicOfficeSec(
  rawSec: number,
  enabled: boolean,
  resetKey?: string,
): number {
  const peakRef = useRef(0)
  const resetKeyRef = useRef(resetKey)

  // 日期切换（尤其跨午夜）必须在本次 render 内同步清峰值，避免新一天短暂显示昨日累计。
  if (resetKeyRef.current !== resetKey) {
    resetKeyRef.current = resetKey
    peakRef.current = 0
  }

  useEffect(() => {
    if (!enabled) {
      peakRef.current = 0
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const reset = () => {
      peakRef.current = 0
    }
    window.addEventListener(APP_DATA_CHANGED_EVENT, reset)
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, reset)
  }, [enabled])

  if (!enabled) return rawSec

  const raw = Math.max(0, Math.floor(rawSec))
  if (raw >= peakRef.current) {
    peakRef.current = raw
  }

  return peakRef.current
}
