import { useEffect, useMemo, useState } from 'react'
import {
  clearNextAiSummaryAt,
  ensureAiSummaryAnchoredForSession,
  formatAiSummaryCountdown,
  getNextAiSummaryAtMs,
  isAiSummaryScheduleDay,
} from '../lib/aiSummarySchedule'
import { compareLocalCalendarDay } from '../lib/timeutil'
import {
  isAiAutoSummaryActive,
  loadWorkRecordSettings,
  systemRecordPeriodLabel,
  WORK_RECORD_SETTINGS_CHANGED_EVENT,
  type WorkRecordSettings,
} from '../lib/workRecordSettings'
import { StatusPulseDot } from './StatusPulseDot'

/** 今日工作记录标题后：未开启提示 */
export function AiAutoSummaryInactiveBadge() {
  return (
    <span
      className="text-[10px] font-medium leading-none text-ganshale-muted"
      role="status"
    >
      未开启AI自动总结
    </span>
  )
}

/** 今日工作记录标题后：AI 自动总结进行中 + 下次总结倒计时 */
export function AiAutoSummaryActiveBadge({ day }: { day: Date }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [settings, setSettings] = useState(() => loadWorkRecordSettings())
  const dayKind = compareLocalCalendarDay(day, new Date(nowMs))
  const isToday = dayKind === 'today'
  const badgeLabel =
    dayKind === 'future' ? 'AI自动总结未开始' : 'AI自动总结中'

  useEffect(() => {
    if (!isAiAutoSummaryActive(settings) || !isAiSummaryScheduleDay(day)) return
    clearNextAiSummaryAt(day)
    ensureAiSummaryAnchoredForSession(day, settings, Date.now())
  }, [day, settings.aiAutoSummaryEnabled, settings.systemRecordPeriod])

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
    if (!isToday || !isAiAutoSummaryActive(settings)) return null
    const nextAt = getNextAiSummaryAtMs(day, settings, nowMs)
    if (nextAt == null) return null
    return formatAiSummaryCountdown(nextAt - nowMs)
  }, [day, isToday, settings, nowMs])

  const countdownTitle = useMemo(() => {
    const label = systemRecordPeriodLabel(settings.systemRecordPeriod)
    return `下次自动总结（间隔 ${label}）`
  }, [settings.systemRecordPeriod])

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        isToday
          ? 'border-emerald-200/90 bg-emerald-50/80 text-emerald-950'
          : 'border-black/[0.06] bg-black/[0.03] text-ganshale-subtle',
      ].join(' ')}
      role="status"
      title={
        isToday
          ? '今日自动总结已开启'
          : dayKind === 'future'
            ? '所选日期尚未开始，不会自动总结'
            : '仅在选择「今天」时自动总结'
      }
    >
      <StatusPulseDot active={isToday} />
      <span>{badgeLabel}</span>
      {isToday && countdown ? (
        <span
          className="font-mono font-normal tabular-nums text-emerald-800/90"
          title={countdownTitle}
        >
          {countdown}
        </span>
      ) : null}
    </span>
  )
}

/** 根据设置展示 AI 自动总结状态（标题右侧） */
export function AiAutoSummaryStatusSuffix({
  day,
  settings,
}: {
  day: Date
  settings: WorkRecordSettings
}) {
  if (!isAiAutoSummaryActive(settings)) {
    return <AiAutoSummaryInactiveBadge />
  }
  return <AiAutoSummaryActiveBadge day={day} />
}
