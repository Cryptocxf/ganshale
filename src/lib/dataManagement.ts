import {
  endOfLocalDay,
  endOfMonthLocal,
  parseYmdLocal,
  startOfLocalDay,
  startOfMonthLocal,
  toYmdLocal,
} from './timeutil'
import * as store from './idbStore'
import { BUCKET_AFK, BUCKET_WEB, BUCKET_WINDOW } from './seed'
import { SESSION_REFLECTIONS_STORAGE_KEY } from './sessionReflectionsStore'

const DAY_KEY_PREFIXES = [
  'ganshale-work-records:',
  'ganshale-work-records-dismissed-system:',
  'ganshale-daily-report-history:',
  'ganshale-daily-report-tile-summary:',
  'ganshale-daily-report-auto:',
] as const

const WEEK_KEY_PREFIX = 'ganshale-weekly-report-history:'
const WEEK_AUTO_PREFIX = 'ganshale-weekly-report-auto:'
const MONTH_KEY_PREFIX = 'ganshale-monthly-report-history:'
const MONTH_AUTO_PREFIX = 'ganshale-monthly-report-auto:'
const AI_SUMMARY_PREFIXES = [
  'ganshale-ai-summary-last-fire:',
  'ganshale-ai-summary-next-at:',
] as const

export type DataClearFilter =
  | { mode: 'all' }
  | { mode: 'range'; year: number; month?: number; day?: number }

function ymdInFilter(ymd: string, filter: DataClearFilter): boolean {
  if (filter.mode === 'all') return true
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (y !== filter.year) return false
  if (filter.month != null && mo !== filter.month) return false
  if (filter.day != null && d !== filter.day) return false
  return true
}

function monthKeyInFilter(key: string, filter: DataClearFilter): boolean {
  if (filter.mode === 'all') return true
  const m = /^(\d{4})-(\d{2})$/.exec(key)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  if (y !== filter.year) return false
  if (filter.month == null) return true
  return mo === filter.month
}

function weekKeyInFilter(weekMondayYmd: string, filter: DataClearFilter): boolean {
  if (filter.mode === 'all') return true
  const monday = parseYmdLocal(weekMondayYmd)
  if (!monday) return false
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    if (ymdInFilter(toYmdLocal(d), filter)) return true
  }
  return false
}

function resolveEventRange(filter: DataClearFilter): { start: Date; end: Date } | null {
  if (filter.mode === 'all') return null
  const { year, month, day } = filter
  if (day != null && month != null) {
    const anchor = new Date(year, month - 1, day, 12, 0, 0, 0)
    return { start: startOfLocalDay(anchor), end: endOfLocalDay(anchor) }
  }
  if (month != null) {
    const anchor = new Date(year, month - 1, 1)
    return { start: startOfMonthLocal(anchor), end: endOfMonthLocal(anchor) }
  }
  return {
    start: startOfLocalDay(new Date(year, 0, 1)),
    end: endOfLocalDay(new Date(year, 11, 31)),
  }
}

function clearLocalStorageByFilter(filter: DataClearFilter): number {
  if (typeof window === 'undefined') return 0
  let removed = 0
  const keys = Object.keys(localStorage)

  for (const key of keys) {
    let shouldRemove = false

    for (const prefix of DAY_KEY_PREFIXES) {
      if (key.startsWith(prefix)) {
        const ymd = key.slice(prefix.length)
        shouldRemove = ymdInFilter(ymd, filter)
        break
      }
    }

    if (!shouldRemove && key.startsWith(WEEK_KEY_PREFIX)) {
      shouldRemove = weekKeyInFilter(key.slice(WEEK_KEY_PREFIX.length), filter)
    }
    if (!shouldRemove && key.startsWith(WEEK_AUTO_PREFIX)) {
      shouldRemove = weekKeyInFilter(key.slice(WEEK_AUTO_PREFIX.length), filter)
    }
    if (!shouldRemove && key.startsWith(MONTH_KEY_PREFIX)) {
      shouldRemove = monthKeyInFilter(key.slice(MONTH_KEY_PREFIX.length), filter)
    }
    if (!shouldRemove && key.startsWith(MONTH_AUTO_PREFIX)) {
      shouldRemove = ymdInFilter(key.slice(MONTH_AUTO_PREFIX.length), filter)
    }
    if (!shouldRemove) {
      for (const prefix of AI_SUMMARY_PREFIXES) {
        if (key.startsWith(prefix)) {
          shouldRemove = ymdInFilter(key.slice(prefix.length), filter)
          break
        }
      }
    }

    if (shouldRemove) {
      localStorage.removeItem(key)
      removed += 1
    }
  }

  if (filter.mode === 'all') {
    localStorage.removeItem(SESSION_REFLECTIONS_STORAGE_KEY)
    localStorage.removeItem('ganshale-workday-timer-frozen-v1')
  } else {
    try {
      const raw = localStorage.getItem(SESSION_REFLECTIONS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt?: string }[]
        if (Array.isArray(parsed)) {
          const kept = parsed.filter((row) => {
            const t = row?.savedAt ? new Date(row.savedAt).getTime() : NaN
            if (Number.isNaN(t)) return true
            return !ymdInFilter(toYmdLocal(new Date(t)), filter)
          })
          if (kept.length === 0) localStorage.removeItem(SESSION_REFLECTIONS_STORAGE_KEY)
          else localStorage.setItem(SESSION_REFLECTIONS_STORAGE_KEY, JSON.stringify(kept))
        }
      }
    } catch {
      /* ignore */
    }
  }

  return removed
}

export async function clearScopedAppData(filter: DataClearFilter): Promise<{
  eventsDeleted: number
  localKeysRemoved: number
}> {
  let eventsDeleted = 0

  if (filter.mode === 'all') {
    const eventsDeleted = await store.countEvents()
    await store.clearAllData()
    const keys = Object.keys(localStorage)
    let localKeysRemoved = 0
    for (const key of keys) {
      if (
        key.startsWith('ganshale-work-records') ||
        key.startsWith('ganshale-daily-report') ||
        key.startsWith('ganshale-weekly-report') ||
        key.startsWith('ganshale-monthly-report') ||
        AI_SUMMARY_PREFIXES.some((p) => key.startsWith(p)) ||
        key === SESSION_REFLECTIONS_STORAGE_KEY ||
        key === 'ganshale-workday-timer-frozen-v1'
      ) {
        localStorage.removeItem(key)
        localKeysRemoved += 1
      }
    }
    return { eventsDeleted, localKeysRemoved }
  }

  const range = resolveEventRange(filter)
  if (range) {
    for (const bucketId of [BUCKET_WINDOW, BUCKET_WEB, BUCKET_AFK]) {
      eventsDeleted += await store.deleteEventsInRange(
        bucketId,
        range.start.toISOString(),
        range.end.toISOString(),
      )
    }
  }

  const localKeysRemoved = clearLocalStorageByFilter(filter)
  return { eventsDeleted, localKeysRemoved }
}

const STORAGE_IPC_TIMEOUT_MS = 5000

const BROWSER_STORAGE_FALLBACK = {
  path: 'IndexedDB · ganshale_aw',
  canChange: false,
  hint: '浏览器模式下数据保存在本机 IndexedDB，无法在应用内更改存储目录。',
} as const

export async function getStorageLocationLabel(): Promise<{
  path: string
  canChange: boolean
  hint: string
}> {
  const desktop = typeof window !== 'undefined' ? window.ganshaleDesktop : undefined
  if (!desktop?.getStoragePath) {
    return { ...BROWSER_STORAGE_FALLBACK }
  }

  try {
    const res = await Promise.race([
      desktop.getStoragePath(),
      new Promise<{ ok: false; error: string }>((resolve) => {
        window.setTimeout(
          () => resolve({ ok: false, error: '读取存储路径超时' }),
          STORAGE_IPC_TIMEOUT_MS,
        )
      }),
    ])
    if (res.ok && res.path) {
      return {
        path: res.path,
        canChange: true,
        hint: '窗口记录保存在此目录下的 IndexedDB 中；更改后需重启应用生效。',
      }
    }
  } catch {
    /* fall through to fallback below */
  }

  return {
    path: BROWSER_STORAGE_FALLBACK.path,
    canChange: false,
    hint: '无法读取 Electron 存储目录，请完全退出并重新打开客户端；若仍失败，数据仍在默认 IndexedDB 中。',
  }
}
