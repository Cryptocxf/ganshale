import type { AwEvent } from './awTypes'
import { identityFromEventData } from './windowAppDisplay'
import { toYmdLocal } from './timeutil'

const STORAGE_KEY = 'ganshale-app-duration-compare-v1'

export const APP_DURATION_COMPARE_CHANGED_EVENT = 'ganshale-app-duration-compare-changed'

type DayCompareState = {
  queue: string[]
  removed: string[]
}

function storageKeyForDay(day: Date): string {
  return `${STORAGE_KEY}:${toYmdLocal(day)}`
}

function readAllLegacy(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const j = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(j)) {
      if (Array.isArray(v)) {
        out[k] = v
          .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
          .map((x) => x.trim())
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseDayState(raw: string | null, legacyQueue?: string[]): DayCompareState {
  if (legacyQueue?.length) {
    return { queue: [...legacyQueue], removed: [] }
  }
  if (!raw) return { queue: [], removed: [] }
  try {
    const j = JSON.parse(raw) as unknown
    if (Array.isArray(j)) {
      return {
        queue: j
          .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
          .map((x) => x.trim()),
        removed: [],
      }
    }
    if (j && typeof j === 'object') {
      const o = j as { queue?: unknown; removed?: unknown }
      const queue = Array.isArray(o.queue)
        ? o.queue
            .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
            .map((x) => x.trim())
        : []
      const removed = Array.isArray(o.removed)
        ? o.removed
            .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
            .map((x) => x.trim())
        : []
      return { queue, removed }
    }
  } catch {
    /* ignore */
  }
  return { queue: [], removed: [] }
}

function loadDayState(day: Date): DayCompareState {
  const ymd = toYmdLocal(day)
  const legacy = readAllLegacy()[ymd]
  try {
    const raw = localStorage.getItem(storageKeyForDay(day))
    return parseDayState(raw, legacy?.length ? legacy : undefined)
  } catch {
    return { queue: [], removed: [] }
  }
}

function saveDayState(day: Date, state: DayCompareState): void {
  const ymd = toYmdLocal(day)
  const queue: string[] = []
  for (const k of state.queue) {
    const t = k.trim()
    if (!t || queue.includes(t)) continue
    queue.push(t)
  }
  const removed: string[] = []
  for (const k of state.removed) {
    const t = k.trim()
    if (!t || removed.includes(t)) continue
    removed.push(t)
  }
  const payload: DayCompareState = { queue, removed }
  try {
    localStorage.setItem(storageKeyForDay(day), JSON.stringify(payload))
  } catch {
    /* ignore */
  }
  const all = readAllLegacy()
  delete all[ymd]
  if (Object.keys(all).length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore */
    }
  } else {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
  emitChanged()
}

function emitChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(APP_DURATION_COMPARE_CHANGED_EVENT))
}

/** 当日应用时长对比队列（identityKey 列表） */
export function loadAppDurationCompareQueue(day: Date): string[] {
  return loadDayState(day).queue
}

/** 将窗口记录中的应用自动加入对比队列（用户曾删除的除外） */
export function syncCompareQueueFromWindowEvents(day: Date, events: AwEvent[]): void {
  const keys = new Set<string>()
  for (const ev of events) {
    keys.add(identityFromEventData(ev.data).identityKey)
  }
  const state = loadDayState(day)
  const removedSet = new Set(state.removed)
  let changed = false
  const nextQueue = [...state.queue]
  for (const k of keys) {
    if (removedSet.has(k)) continue
    if (!nextQueue.includes(k)) {
      nextQueue.push(k)
      changed = true
    }
  }
  if (!changed) return
  saveDayState(day, { queue: nextQueue, removed: state.removed })
}

export function addToAppDurationCompareQueue(day: Date, identityKey: string): void {
  const key = identityKey.trim()
  if (!key) return
  const state = loadDayState(day)
  const removed = state.removed.filter((k) => k !== key)
  const queue = state.queue.includes(key) ? state.queue : [...state.queue, key]
  saveDayState(day, { queue, removed })
}

export function removeFromAppDurationCompareQueue(day: Date, identityKey: string): void {
  const key = identityKey.trim()
  if (!key) return
  const state = loadDayState(day)
  const queue = state.queue.filter((k) => k !== key)
  const removed = state.removed.includes(key) ? state.removed : [...state.removed, key]
  saveDayState(day, { queue, removed })
}

export function isInAppDurationCompareQueue(day: Date, identityKey: string): boolean {
  return loadAppDurationCompareQueue(day).includes(identityKey.trim())
}
