import { startOfMonthLocal } from './timeutil'

export type MonthlyReportHistoryEntry = {
  id: string
  text: string
  /** ISO 8601 */
  createdAt: string
}

const STORAGE_PREFIX = 'ganshale-monthly-report-history:'

export const MONTHLY_REPORT_HISTORY_CHANGED_EVENT = 'ganshale-monthly-report-history-changed'

function monthKey(monthAnchor: Date): string {
  const m = startOfMonthLocal(monthAnchor)
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
}

function storageKey(monthAnchor: Date): string {
  return `${STORAGE_PREFIX}${monthKey(monthAnchor)}`
}

export function sortMonthlyReportHistoryByTimeAsc(
  entries: MonthlyReportHistoryEntry[],
): MonthlyReportHistoryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export function loadMonthlyReportHistory(monthAnchor: Date): MonthlyReportHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(monthAnchor))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: MonthlyReportHistoryEntry[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const row = item as Partial<MonthlyReportHistoryEntry>
      if (typeof row.text !== 'string' || typeof row.createdAt !== 'string') continue
      out.push({
        id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
        text: row.text,
        createdAt: row.createdAt,
      })
    }
    return sortMonthlyReportHistoryByTimeAsc(out)
  } catch {
    return []
  }
}

export function saveMonthlyReportHistory(
  monthAnchor: Date,
  entries: MonthlyReportHistoryEntry[],
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(monthAnchor), JSON.stringify(entries))
    window.dispatchEvent(new CustomEvent(MONTHLY_REPORT_HISTORY_CHANGED_EVENT))
  } catch {
    /* quota */
  }
}

export function appendMonthlyReportHistory(
  monthAnchor: Date,
  text: string,
): MonthlyReportHistoryEntry {
  const trimmed = text.trim()
  const entry: MonthlyReportHistoryEntry = {
    id: crypto.randomUUID(),
    text: trimmed,
    createdAt: new Date().toISOString(),
  }
  const prev = loadMonthlyReportHistory(monthAnchor)
  saveMonthlyReportHistory(monthAnchor, [...prev, entry])
  return entry
}

export function removeMonthlyReportHistoryEntry(monthAnchor: Date, id: string): void {
  const prev = loadMonthlyReportHistory(monthAnchor)
  const next = prev.filter((e) => e.id !== id)
  if (next.length === prev.length) return
  saveMonthlyReportHistory(monthAnchor, next)
}

/** 本地曾保存过月报的月份键（`YYYY-MM`） */
export function loadMonthKeysWithMonthlyReports(): Set<string> {
  const out = new Set<string>()
  if (typeof window === 'undefined') return out
  const prefix = STORAGE_PREFIX
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(prefix)) continue
      const key = k.slice(prefix.length)
      if (key) out.add(key)
    }
  } catch {
    /* ignore */
  }
  return out
}
