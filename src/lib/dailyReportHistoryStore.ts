import { toYmdLocal } from './timeutil'

export type DailyReportHistoryEntry = {
  id: string
  text: string
  /** ISO 8601 */
  createdAt: string
}

const STORAGE_PREFIX = 'ganshale-daily-report-history:'

export const DAILY_REPORT_HISTORY_CHANGED_EVENT = 'ganshale-daily-report-history-changed'

function storageKey(day: Date): string {
  return `${STORAGE_PREFIX}${toYmdLocal(day)}`
}

export function loadDailyReportHistory(day: Date): DailyReportHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(day))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: DailyReportHistoryEntry[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const row = item as Partial<DailyReportHistoryEntry>
      if (typeof row.text !== 'string' || typeof row.createdAt !== 'string') continue
      out.push({
        id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
        text: row.text,
        createdAt: row.createdAt,
      })
    }
    return sortDailyReportHistoryByTimeAsc(out)
  } catch {
    return []
  }
}

/** 按输出时间从早到晚 */
export function sortDailyReportHistoryByTimeAsc(
  entries: DailyReportHistoryEntry[],
): DailyReportHistoryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export function saveDailyReportHistory(day: Date, entries: DailyReportHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(day), JSON.stringify(entries))
    window.dispatchEvent(new CustomEvent(DAILY_REPORT_HISTORY_CHANGED_EVENT))
  } catch {
    /* quota */
  }
}

export function appendDailyReportHistory(day: Date, text: string): DailyReportHistoryEntry {
  const trimmed = text.trim()
  const entry: DailyReportHistoryEntry = {
    id: crypto.randomUUID(),
    text: trimmed,
    createdAt: new Date().toISOString(),
  }
  const prev = loadDailyReportHistory(day)
  saveDailyReportHistory(day, [...prev, entry])
  return entry
}

export function removeDailyReportHistoryEntry(day: Date, id: string): void {
  const prev = loadDailyReportHistory(day)
  const next = prev.filter((e) => e.id !== id)
  if (next.length === prev.length) return
  saveDailyReportHistory(day, next)
}

/** 本地曾保存过日报的日期键（`YYYY-MM-DD`） */
export function loadDayKeysWithDailyReports(): Set<string> {
  const out = new Set<string>()
  if (typeof window === 'undefined') return out
  const prefix = STORAGE_PREFIX
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(prefix)) continue
      const ymd = k.slice(prefix.length)
      if (ymd) out.add(ymd)
    }
  } catch {
    /* ignore */
  }
  return out
}
