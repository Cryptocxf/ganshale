import { toYmdLocal } from './timeutil'

const TIMER_PAUSE_STORAGE_KEY = 'ganshale-workday-timer-pause-v1'

type TimerPausePayload = { ymd: string; startMs?: number }

export type WorkdayPauseInterval = { startMs: number; endMs: number }

export function totalWorkdayPausedMs(
  intervals: readonly WorkdayPauseInterval[],
  options?: { activeStartMs?: number | null; activeEndMs?: number | null },
): number {
  let total = 0
  for (const iv of intervals) {
    total += Math.max(0, iv.endMs - iv.startMs)
  }
  const activeStart = options?.activeStartMs
  const activeEnd = options?.activeEndMs
  if (activeStart != null && activeEnd != null) {
    total += Math.max(0, activeEnd - activeStart)
  }
  return total
}

/** 从原始办公秒数中扣除用户暂停计时的时长。 */
export function officeSecondsAfterPause(rawSec: number, pausedMs: number): number {
  return Math.max(0, Math.round(rawSec) - Math.round(pausedMs / 1000))
}

export function hasTodayWorkdayTimerPaused(): boolean {
  try {
    const raw = sessionStorage.getItem(TIMER_PAUSE_STORAGE_KEY)
    if (!raw) return false
    const o = JSON.parse(raw) as Partial<TimerPausePayload>
    if (typeof o.ymd !== 'string') return false
    const todayYmd = toYmdLocal(new Date())
    if (o.ymd !== todayYmd) {
      sessionStorage.removeItem(TIMER_PAUSE_STORAGE_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function readTodayWorkdayPauseStartMs(): number | null {
  try {
    const raw = sessionStorage.getItem(TIMER_PAUSE_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<TimerPausePayload>
    if (typeof o.ymd !== 'string') return null
    const todayYmd = toYmdLocal(new Date())
    if (o.ymd !== todayYmd) return null
    return typeof o.startMs === 'number' && Number.isFinite(o.startMs) ? o.startMs : null
  } catch {
    return null
  }
}

export function persistWorkdayTimerPause(startMs = Date.now()) {
  try {
    const payload: TimerPausePayload = { ymd: toYmdLocal(new Date()), startMs }
    sessionStorage.setItem(TIMER_PAUSE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function clearWorkdayTimerPause() {
  try {
    sessionStorage.removeItem(TIMER_PAUSE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
