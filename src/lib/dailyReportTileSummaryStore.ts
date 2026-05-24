import { toYmdLocal } from './timeutil'

export type DailyReportTileSummaryRecord = {
  summary: string
  /** ISO */
  generatedAt: string
  sourceEntryId: string
}

const STORAGE_PREFIX = 'ganshale-daily-report-tile-summary:'

export const DAILY_REPORT_TILE_SUMMARY_CHANGED_EVENT =
  'ganshale-daily-report-tile-summary-changed'

function storageKey(day: Date): string {
  return `${STORAGE_PREFIX}${toYmdLocal(day)}`
}

export function loadDailyReportTileSummary(day: Date): DailyReportTileSummaryRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(day))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DailyReportTileSummaryRecord>
    if (typeof parsed.summary !== 'string' || typeof parsed.generatedAt !== 'string') {
      return null
    }
    return {
      summary: parsed.summary.trim(),
      generatedAt: parsed.generatedAt,
      sourceEntryId:
        typeof parsed.sourceEntryId === 'string' ? parsed.sourceEntryId : '',
    }
  } catch {
    return null
  }
}

export function saveDailyReportTileSummary(
  day: Date,
  record: DailyReportTileSummaryRecord,
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(day), JSON.stringify(record))
    window.dispatchEvent(new CustomEvent(DAILY_REPORT_TILE_SUMMARY_CHANGED_EVENT))
  } catch {
    /* quota */
  }
}

export function clearDailyReportTileSummary(day: Date): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey(day))
    window.dispatchEvent(new CustomEvent(DAILY_REPORT_TILE_SUMMARY_CHANGED_EVENT))
  } catch {
    /* ignore */
  }
}
