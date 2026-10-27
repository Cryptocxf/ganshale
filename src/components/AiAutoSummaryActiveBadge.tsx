import { useEffect, useMemo, useState } from 'react'
import {
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
import { Loader2, Play } from 'lucide-react'

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
export function AiAutoSummaryActiveBadge({ day, busy, onStart }: { day: Date; busy?: boolean; onStart?: () => void }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [settings, setSettings] = useState(() => loadWorkRecordSettings())
  const dayKind = compareLocalCalendarDay(day, new Date(nowMs))
  const isToday = dayKind === 'today'
  const badgeLabel =
    dayKind === 'future' ? 'AI总结未开始' : 'AI总结'

  useEffect(() => {
    if (!isAiAutoSummaryActive(settings) || !isAiSummaryScheduleDay(day)) return
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
      {isToday && onStart ? (
        <button type="button" onClick={onStart} disabled={busy}
          aria-label={busy ? 'AI总结中' : '立即进行AI总结'}
          title={busy ? 'AI总结中，请稍候' : '立即进行AI总结'}
          className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-emerald-200/70 disabled:cursor-wait">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
        </button>
      ) : null}
    </span>
  )
}

/** 根据设置展示 AI 自动总结状态（标题右侧） */
export function AiAutoSummaryStatusSuffix({
  day,
  settings,
  busy,
  onStart,
}: {
  day: Date
  settings: WorkRecordSettings
  busy?: boolean
  onStart?: () => void
}) {
  if (!isAiAutoSummaryActive(settings)) {
    return <AiAutoSummaryInactiveBadge />
  }
  return <AiAutoSummaryActiveBadge day={day} busy={busy} onStart={onStart} />
}
