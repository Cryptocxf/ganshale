import { runDailyReportTileSummaryAtMidnight } from './dailyReportTileSummary'
import { clearAiSummaryScheduleForDay, ensureAiSummaryAnchoredForSession } from './aiSummarySchedule'
import { clearWorkdayClockOutPersist, markClientWorkSessionStart } from './clientSessionClock'
import { loadWorkRecordSettings } from './workRecordSettings'
import { msUntilNextLocalMidnight, startOfLocalDay, toYmdLocal } from './timeutil'

export const LOCAL_MIDNIGHT_EVENT = 'ganshale-local-midnight'

export type LocalMidnightDetail = {
  prevYmd: string
  ymd: string
}

export function dispatchLocalMidnight(detail: LocalMidnightDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<LocalMidnightDetail>(LOCAL_MIDNIGHT_EVENT, { detail }))
}

/** 跨本地自然日时：清空「今天」的运行态，历史按日期键保留。 */
export function applyLocalMidnightRollover(detail: LocalMidnightDetail): void {
  const today = startOfLocalDay(new Date())
  clearWorkdayClockOutPersist()
  markClientWorkSessionStart(Date.now())
  clearAiSummaryScheduleForDay(today)
  ensureAiSummaryAnchoredForSession(today, loadWorkRecordSettings())
  runDailyReportTileSummaryAtMidnight(detail.prevYmd)
  dispatchLocalMidnight(detail)
}

/**
 * 在下次本地 0:00 触发回调；另每 30s 校验一次（休眠唤醒后补发）。
 * 返回取消函数。
 */
export function createLocalMidnightWatcher(
  onCross: (detail: LocalMidnightDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  let lastYmd = toYmdLocal(new Date())
  let timeoutId = 0

  const tick = () => {
    const ymd = toYmdLocal(new Date())
    if (ymd === lastYmd) return
    const detail: LocalMidnightDetail = { prevYmd: lastYmd, ymd }
    lastYmd = ymd
    onCross(detail)
  }

  const scheduleNext = () => {
    window.clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      tick()
      scheduleNext()
    }, Math.max(250, msUntilNextLocalMidnight() + 80))
  }

  scheduleNext()
  const intervalId = window.setInterval(tick, 30_000)

  return () => {
    window.clearTimeout(timeoutId)
    window.clearInterval(intervalId)
  }
}
