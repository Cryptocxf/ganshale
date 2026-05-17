import { useEffect, useMemo, useState } from 'react'
import {
  formatAiSummaryCountdown,
  getNextAiSummaryAtMs,
} from '../lib/aiSummarySchedule'
import {
  loadWorkRecordSettings,
  WORK_RECORD_SETTINGS_CHANGED_EVENT,
} from '../lib/workRecordSettings'
import { StatusPulseDot } from './StatusPulseDot'

/** 今日工作记录标题后：AI 自动总结进行中 + 下次总结倒计时 */
export function AiAutoSummaryActiveBadge({ day }: { day: Date }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [settings, setSettings] = useState(() => loadWorkRecordSettings())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    const syncSettings = () => setSettings(loadWorkRecordSettings())
    window.addEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, syncSettings)
    window.addEventListener('storage', syncSettings)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, syncSettings)
      window.removeEventListener('storage', syncSettings)
    }
  }, [])

  const countdown = useMemo(() => {
    const nextAt = getNextAiSummaryAtMs(day, settings, nowMs)
    if (nextAt == null) return null
    return formatAiSummaryCountdown(nextAt - nowMs)
  }, [day, settings, nowMs])

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-emerald-200/90 bg-emerald-50/80 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-950"
      role="status"
    >
      <StatusPulseDot active />
      <span>AI自动总结中</span>
      {countdown ? (
        <span className="font-mono font-normal tabular-nums text-emerald-800/90" title="下次自动总结">
          {countdown}
        </span>
      ) : null}
    </span>
  )
}
