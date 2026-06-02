import { endOfLocalDay, isSameLocalCalendarDay, startOfLocalDay, toYmdLocal } from './timeutil'

/**
 * Wall-clock time when this page loaded. Used as fallback for the session work timer.
 * Prefer `performance.timeOrigin` so it matches navigation start (not double-reset in React StrictMode).
 */
function readNavigationStartMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number') {
    return Math.floor(performance.timeOrigin)
  }
  return Date.now()
}

const NAVIGATION_START_MS = readNavigationStartMs()

/** When set (e.g. after desktop splash), overrides {@link NAVIGATION_START_MS} for the work timer. */
let sessionStartOverrideMs: number | null = null

/** Call when the app UI becomes active (e.g. splash dismissed) so the timer excludes splash time. */
export function markClientWorkSessionStart(ms = Date.now()) {
  sessionStartOverrideMs = ms
}

export function getClientSessionStartMs(): number {
  return sessionStartOverrideMs ?? NAVIGATION_START_MS
}

const CLOCKOUT_STORAGE_KEY = 'ganshale-workday-clockout-v1'

type WorkdayClockOutPayload = { ymd: string; clockOutAtMs: number }

/** 用户点击「下班了」时写入，用于冻结当日计时；跨自然日或「上班中」时清除。 */
export function persistWorkdayClockOut(atMs: number = Date.now()) {
  try {
    const payload: WorkdayClockOutPayload = {
      ymd: toYmdLocal(new Date()),
      clockOutAtMs: atMs,
    }
    sessionStorage.setItem(CLOCKOUT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function clearWorkdayClockOutPersist() {
  try {
    sessionStorage.removeItem(CLOCKOUT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 读取当日下班冻结时刻；若存的是别的自然日则丢弃。 */
export function readWorkdayClockOut(): WorkdayClockOutPayload | null {
  try {
    const raw = sessionStorage.getItem(CLOCKOUT_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<WorkdayClockOutPayload>
    if (typeof o.ymd !== 'string' || typeof o.clockOutAtMs !== 'number') return null
    const todayYmd = toYmdLocal(new Date())
    if (o.ymd !== todayYmd) {
      sessionStorage.removeItem(CLOCKOUT_STORAGE_KEY)
      return null
    }
    return { ymd: o.ymd, clockOutAtMs: o.clockOutAtMs }
  } catch {
    return null
  }
}

export function hasTodayClockOutPersisted(): boolean {
  return readWorkdayClockOut() !== null
}

export const FROZEN_TIMER_STORAGE_KEY = 'ganshale-workday-timer-frozen-v2'
const FROZEN_TIMER_MAX_DAYS = 120

function readFrozenTimerMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FROZEN_TIMER_STORAGE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || typeof v !== 'number' || !Number.isFinite(v)) continue
      out[k] = Math.max(0, Math.floor(v))
    }
    return out
  } catch {
    return {}
  }
}

function pruneFrozenTimerMap(map: Record<string, number>): Record<string, number> {
  const keys = Object.keys(map).sort()
  if (keys.length <= FROZEN_TIMER_MAX_DAYS) return map
  const drop = keys.length - FROZEN_TIMER_MAX_DAYS
  const next = { ...map }
  for (let i = 0; i < drop; i++) delete next[keys[i]!]
  return next
}

/** 读取今日已写入 localStorage 的办公累计秒数快照。 */
export function readTodayFrozenTimerSec(): number | undefined {
  return getFrozenTimerSecForYmd(toYmdLocal(new Date()))
}

/** 每秒调用：把「今天」当前累计秒数写入本地，便于切到历史日时仍显示截至当时的数值（不归零）。 */
export function persistLiveTodayFrozenSec(elapsedSec: number) {
  const ymd = toYmdLocal(new Date())
  const map = readFrozenTimerMap()
  const next = Math.max(0, Math.floor(elapsedSec))
  map[ymd] = next
  const pruned = pruneFrozenTimerMap(map)
  try {
    localStorage.setItem(FROZEN_TIMER_STORAGE_KEY, JSON.stringify(pruned))
  } catch {
    /* quota */
  }
}

function getFrozenTimerSecForYmd(ymd: string): number | undefined {
  return readFrozenTimerMap()[ymd]
}

/**
 * 本地「今天」的实时累计秒数（与日期选择无关）：用于写入 frozen 快照。
 * 上界为当日 23:59:59.999。不再因「下班了」或设置的下班时刻而提前截止。
 */
export function getTodayLiveWorkdayElapsedSec(_collectionPausedByUser = false): number {
  const today = new Date()
  const now = Date.now()
  const dayStartMs = startOfLocalDay(today).getTime()
  const dayEndMs = endOfLocalDay(today).getTime()

  const sessionStart = getClientSessionStartMs()
  const countFrom = Math.max(sessionStart, dayStartMs)
  const effectiveEnd = Math.min(now, dayEndMs)

  return Math.max(0, Math.floor((effectiveEnd - countFrom) / 1000))
}

/**
 * 「今日打工时长」展示秒数：
 * - 所选为**本地今天**：实时累计（含下班/24 点规则）；
 * - 所选为**历史自然日**：读取本地已保存的该日快照（有则显示，无则 0）。
 */
export function getWorkdayTimerElapsedSec(
  selectedDay: Date,
  collectionPausedByUser: boolean,
): number {
  const today = new Date()
  if (!isSameLocalCalendarDay(selectedDay, today)) {
    return getFrozenTimerSecForYmd(toYmdLocal(selectedDay)) ?? 0
  }
  return getTodayLiveWorkdayElapsedSec(collectionPausedByUser)
}
