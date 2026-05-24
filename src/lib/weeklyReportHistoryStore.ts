import { startOfWeekMondayLocal, toYmdLocal } from './timeutil'

export type WeeklyReportHistoryEntry = {
  id: string
  text: string
  /** ISO 8601 */
  createdAt: string
}

const STORAGE_PREFIX = 'ganshale-weekly-report-history:'

export const WEEKLY_REPORT_HISTORY_CHANGED_EVENT = 'ganshale-weekly-report-history-changed'

function storageKey(weekStartMonday: Date): string {
  return `${STORAGE_PREFIX}${toYmdLocal(startOfWeekMondayLocal(weekStartMonday))}`
}

export function sortWeeklyReportHistoryByTimeAsc(
  entries: WeeklyReportHistoryEntry[],
): WeeklyReportHistoryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export function loadWeeklyReportHistory(weekStartMonday: Date): WeeklyReportHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(weekStartMonday))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: WeeklyReportHistoryEntry[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const row = item as Partial<WeeklyReportHistoryEntry>
      if (typeof row.text !== 'string' || typeof row.createdAt !== 'string') continue
      out.push({
        id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
        text: row.text,
        createdAt: row.createdAt,
      })
    }
    return sortWeeklyReportHistoryByTimeAsc(out)
  } catch {
    return []
  }
}

export function saveWeeklyReportHistory(
  weekStartMonday: Date,
  entries: WeeklyReportHistoryEntry[],
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(weekStartMonday), JSON.stringify(entries))
    window.dispatchEvent(new CustomEvent(WEEKLY_REPORT_HISTORY_CHANGED_EVENT))
  } catch {
    /* quota */
  }
}

export function appendWeeklyReportHistory(
  weekStartMonday: Date,
  text: string,
): WeeklyReportHistoryEntry {
  const trimmed = text.trim()
  const entry: WeeklyReportHistoryEntry = {
    id: crypto.randomUUID(),
    text: trimmed,
    createdAt: new Date().toISOString(),
  }
  const prev = loadWeeklyReportHistory(weekStartMonday)
  saveWeeklyReportHistory(weekStartMonday, [...prev, entry])
  return entry
}

export function removeWeeklyReportHistoryEntry(
  weekStartMonday: Date,
  id: string,
): void {
  const prev = loadWeeklyReportHistory(weekStartMonday)
  const next = prev.filter((e) => e.id !== id)
  if (next.length === prev.length) return
  saveWeeklyReportHistory(weekStartMonday, next)
}

/** 本地曾保存过周报的周一日期键（`YYYY-MM-DD`） */
export function loadWeekKeysWithWeeklyReports(): Set<string> {
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
