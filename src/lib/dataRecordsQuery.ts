import type { AwEvent } from './awTypes'
import {
  assignmentKeyMatches,
  loadAppCategoryConfig,
  UNCATEGORIZED_ID,
  type AppCategoryDef,
} from './appCategoryConfig'
import { loadDailyReportHistory, loadDayKeysWithDailyReports } from './dailyReportHistoryStore'
import {
  loadMonthlyReportHistory,
  loadMonthKeysWithMonthlyReports,
} from './monthlyReportHistoryStore'
import { BUCKET_WINDOW } from './seed'
import { shouldSkipWindowEventForStats } from './selfWindowFilter'
import {
  loadWeeklyReportHistory,
  loadWeekKeysWithWeeklyReports,
} from './weeklyReportHistoryStore'
import { identityFromEventData } from './windowAppDisplay'
import {
  daysInLocalWeek,
  endOfLocalDay,
  endOfMonthLocal,
  parseIso,
  startOfLocalDay,
  startOfMonthLocal,
  toYmdLocal,
} from './timeutil'

export type TimeRangeMode = 'unlimited' | 'year' | 'month' | 'date'

/** 0 表示「不限」 */
export function timeRangeModeFromParts(
  filterYear: number,
  filterMonth: number,
  filterDay: number,
): TimeRangeMode {
  if (!filterYear) return 'unlimited'
  if (!filterMonth) return 'year'
  if (!filterDay) return 'month'
  return 'date'
}

export function daysInFilterMonth(year: number, month: number): number {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

export type DurationFilterId =
  | 'any'
  | '10m'
  | '30m'
  | '1h'
  | '2h'

export type MonthlyWeekFilterId = 'any' | 'w1' | 'w2' | 'w3' | 'w4'

export type SortField = 'time' | 'date' | 'duration' | 'app'

export type SortDirection = 'asc' | 'desc'

export type GroupViewMode = 'list' | 'day' | 'app'

export type DataRecordKind = 'window' | 'daily' | 'weekly' | 'monthly'

export const DATA_RECORD_KIND_OPTIONS: { id: DataRecordKind; label: string }[] = [
  { id: 'window', label: '窗口记录' },
  { id: 'daily', label: '每日日报' },
  { id: 'weekly', label: '每周周报' },
  { id: 'monthly', label: '每月月报' },
]

export const DURATION_FILTER_OPTIONS: { id: DurationFilterId; label: string; minSec: number }[] = [
  { id: 'any', label: '不限', minSec: 0 },
  { id: '10m', label: '≥ 10 分钟', minSec: 600 },
  { id: '30m', label: '≥ 30 分钟', minSec: 1800 },
  { id: '1h', label: '≥ 1 小时', minSec: 3600 },
  { id: '2h', label: '≥ 2 小时', minSec: 7200 },
]

export const MONTHLY_WEEK_OPTIONS: { id: MonthlyWeekFilterId; label: string }[] = [
  { id: 'any', label: '不限' },
  { id: 'w1', label: '第一周' },
  { id: 'w2', label: '第二周' },
  { id: 'w3', label: '第三周' },
  { id: 'w4', label: '第四周' },
]

export const TIME_RANGE_MODE_OPTIONS: { id: TimeRangeMode; label: string }[] = [
  { id: 'unlimited', label: '不限' },
  { id: 'year', label: '年份' },
  { id: 'month', label: '月份' },
  { id: 'date', label: '日期' },
]

export type DataRecordsFilterState = {
  recordKind: DataRecordKind
  /** 0 = 不限 */
  filterYear: number
  /** 0 = 不限 */
  filterMonth: number
  /** 0 = 不限 */
  filterDay: number
  /** @deprecated 保留兼容旧预设 */
  weeklyYear: number
  /** @deprecated */
  weeklyMonth: number
  /** 空数组 = 不限（全部类别） */
  categoryIds: string[]
  durationFilter: DurationFilterId
  monthlyWeek: MonthlyWeekFilterId
  /** 表格内应用名称搜索（客户端） */
  appSearchQuery: string
  sortField: SortField
  sortDirection: SortDirection
  viewMode: GroupViewMode
  page: number
  pageSize: number
}

export function buildCategoryFilterOptions(): { id: string; label: string }[] {
  const cats = loadAppCategoryConfig()
  return [
    ...cats.map((c) => ({ id: c.id, label: c.name })),
    { id: UNCATEGORIZED_ID, label: '未分类' },
  ]
}

export function defaultDataRecordsFilters(_now = new Date()): DataRecordsFilterState {
  return {
    recordKind: 'window',
    filterYear: 0,
    filterMonth: 0,
    filterDay: 0,
    weeklyYear: 0,
    weeklyMonth: 0,
    categoryIds: [],
    durationFilter: 'any',
    monthlyWeek: 'any',
    appSearchQuery: '',
    sortField: 'time',
    sortDirection: 'desc',
    viewMode: 'list',
    page: 1,
    pageSize: 50,
  }
}

export function normalizeTimeFilterParts(
  filters: Pick<DataRecordsFilterState, 'filterYear' | 'filterMonth' | 'filterDay'>,
): Pick<DataRecordsFilterState, 'filterYear' | 'filterMonth' | 'filterDay'> {
  let { filterYear, filterMonth, filterDay } = filters
  if (!filterYear) {
    return { filterYear: 0, filterMonth: 0, filterDay: 0 }
  }
  if (!filterMonth) {
    return { filterYear, filterMonth: 0, filterDay: 0 }
  }
  const maxDay = daysInFilterMonth(filterYear, filterMonth)
  if (!filterDay || filterDay > maxDay) {
    filterDay = 0
  }
  return { filterYear, filterMonth, filterDay }
}

export type DataRecordRow = {
  event: AwEvent
  startMs: number
  dateYmd: string
  appExe: string
  appPath?: string
  appLabel: string
  identityKey: string
  title: string
  durationSec: number
  categoryId: string
  categoryLabel: string
  recordKind: DataRecordKind
  reportText?: string
}


export function resolveDateRange(
  filters: Pick<DataRecordsFilterState, 'filterYear' | 'filterMonth' | 'filterDay'>,
  now = new Date(),
): { start: Date; end: Date } {
  const { filterYear, filterMonth, filterDay } = normalizeTimeFilterParts(filters)
  if (!filterYear) {
    return { start: startOfLocalDay(new Date(2000, 0, 1)), end: endOfLocalDay(now) }
  }
  if (!filterMonth) {
    return {
      start: startOfLocalDay(new Date(filterYear, 0, 1)),
      end: endOfLocalDay(new Date(filterYear, 11, 31)),
    }
  }
  if (!filterDay) {
    const anchor = new Date(filterYear, filterMonth - 1, 1)
    return { start: startOfMonthLocal(anchor), end: endOfMonthLocal(anchor) }
  }
  const day = new Date(filterYear, filterMonth - 1, filterDay, 12, 0, 0, 0)
  return { start: startOfLocalDay(day), end: endOfLocalDay(day) }
}

function monthWeekDayBounds(
  year: number,
  month: number,
  week: MonthlyWeekFilterId,
): { startDay: number; endDay: number } | null {
  if (week === 'any') return null
  const weekNum = Number(week.replace('w', ''))
  if (!Number.isFinite(weekNum) || weekNum < 1 || weekNum > 4) return null
  const lastDay = new Date(year, month, 0).getDate()
  const startDay = (weekNum - 1) * 7 + 1
  const endDay = Math.min(weekNum * 7, lastDay)
  return { startDay, endDay }
}

function matchesMonthlyWeek(rowStart: Date, filters: DataRecordsFilterState, now = new Date()): boolean {
  if (filters.recordKind !== 'weekly') return true
  if (filters.monthlyWeek === 'any') return true
  const year = filters.filterYear || now.getFullYear()
  const month = filters.filterMonth || now.getMonth() + 1
  const bounds = monthWeekDayBounds(year, month, filters.monthlyWeek)
  if (!bounds) return true
  if (rowStart.getFullYear() !== year) return false
  if (rowStart.getMonth() + 1 !== month) return false
  const day = rowStart.getDate()
  return day >= bounds.startDay && day <= bounds.endDay
}

export function categoryIdForEvent(
  ev: AwEvent,
  categories: AppCategoryDef[],
): string {
  if (shouldSkipWindowEventForStats(ev)) return UNCATEGORIZED_ID
  const id = identityFromEventData(ev.data)
  for (const cat of categories) {
    for (const kw of cat.keywords) {
      if (assignmentKeyMatches(kw, id.processApp, id.identityKey)) return cat.id
    }
  }
  return UNCATEGORIZED_ID
}

function categoryLabelForId(categoryId: string, categories: AppCategoryDef[]): string {
  if (categoryId === UNCATEGORIZED_ID) return '未分类'
  const hit = categories.find((c) => c.id === categoryId)
  if (hit) return hit.name
  return '未分类'
}

export function enrichDataRecordRow(
  ev: AwEvent,
  categories: AppCategoryDef[],
): DataRecordRow {
  const identity = identityFromEventData(ev.data)
  const startMs = parseIso(ev.timestamp)
  const start = new Date(startMs)
  const categoryId = categoryIdForEvent(ev, categories)
  const appExe = String(ev.data.app ?? '').trim() || 'unknown'
  const appPath = String(ev.data.appPath ?? '').trim() || undefined
  return {
    event: ev,
    startMs,
    dateYmd: toYmdLocal(start),
    appExe,
    appPath,
    appLabel: identity.displayName || appExe.replace(/\.exe$/i, '') || '未知',
    identityKey: identity.identityKey,
    title: String(ev.data.title ?? ''),
    durationSec: Math.round(ev.duration),
    categoryId,
    categoryLabel: categoryLabelForId(categoryId, categories),
    recordKind: 'window',
  }
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase()
  const n = needle.trim().toLowerCase()
  if (!n) return true
  return n.split(/\s+/).every((part) => h.includes(part))
}

export function filterDataRecordRows(
  rows: DataRecordRow[],
  filters: DataRecordsFilterState,
): DataRecordRow[] {
  const minSec =
    DURATION_FILTER_OPTIONS.find((o) => o.id === filters.durationFilter)?.minSec ?? 0
  const categorySet =
    filters.categoryIds.length > 0 ? new Set(filters.categoryIds) : null

  return rows.filter((row) => {
    if (filters.recordKind === 'window') {
      if (categorySet && !categorySet.has(row.categoryId)) return false
      if (row.durationSec < minSec) return false
    }
    if (!matchesMonthlyWeek(new Date(row.startMs), filters)) return false
    if (
      filters.appSearchQuery.trim() &&
      !fuzzyIncludes(row.appLabel, filters.appSearchQuery) &&
      !fuzzyIncludes(row.appExe, filters.appSearchQuery)
    ) {
      return false
    }
    return true
  })
}

export function sortDataRecordRows(
  rows: DataRecordRow[],
  field: SortField,
  direction: SortDirection,
): DataRecordRow[] {
  const mul = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (field === 'time') return (a.startMs - b.startMs) * mul
    if (field === 'date') return a.dateYmd.localeCompare(b.dateYmd) * mul
    if (field === 'duration') return (a.durationSec - b.durationSec) * mul
    return a.appLabel.localeCompare(b.appLabel, 'zh') * mul
  })
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}

export function buildRowsFromEvents(events: AwEvent[]): DataRecordRow[] {
  const categories = loadAppCategoryConfig()
  return events
    .filter((ev) => !shouldSkipWindowEventForStats(ev))
    .map((ev) => enrichDataRecordRow(ev, categories))
}

export function sumDurationSec(rows: DataRecordRow[]): number {
  return rows.reduce((s, r) => s + r.durationSec, 0)
}

export function dataFetchKey(
  filters: Pick<
    DataRecordsFilterState,
    'recordKind' | 'filterYear' | 'filterMonth' | 'filterDay' | 'monthlyWeek'
  >,
): string {
  const parts = normalizeTimeFilterParts(filters)
  return [filters.recordKind, parts.filterYear, parts.filterMonth, parts.filterDay, filters.monthlyWeek].join(
    '|',
  )
}

function reportPreview(text: string, max = 96): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return '—'
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

function syntheticReportEvent(id: string, timestamp: string): AwEvent {
  return {
    id,
    bucket_id: BUCKET_WINDOW,
    timestamp,
    duration: 0,
    data: { app: 'ganshale-report', title: '' },
  }
}

function reportRowBase(
  kind: DataRecordKind,
  id: string,
  createdAt: string,
  periodYmd: string,
  appLabel: string,
  text: string,
): DataRecordRow {
  const startMs = parseIso(createdAt)
  return {
    event: syntheticReportEvent(id, createdAt),
    startMs,
    dateYmd: periodYmd,
    appExe: 'report',
    appLabel,
    identityKey: `${kind}:${id}`,
    title: reportPreview(text),
    durationSec: 0,
    categoryId: UNCATEGORIZED_ID,
    categoryLabel: '—',
    recordKind: kind,
    reportText: text,
  }
}

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d, 12, 0, 0, 0)
}

function parseMonthKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (!y || mo < 1 || mo > 12) return null
  return startOfMonthLocal(new Date(y, mo - 1, 1))
}

function ymdInResolvedRange(ymd: string, start: Date, end: Date): boolean {
  const d = parseYmd(ymd)
  if (!d) return false
  const t = d.getTime()
  return t >= startOfLocalDay(start).getTime() && t <= endOfLocalDay(end).getTime()
}

function monthAnchorInResolvedRange(anchor: Date, start: Date, end: Date): boolean {
  const ms = startOfMonthLocal(anchor).getTime()
  return ms >= startOfMonthLocal(start).getTime() && ms <= endOfMonthLocal(end).getTime()
}

function weekMondayInFilterMonth(weekStart: Date, year: number, month: number): boolean {
  if (!year || !month) return true
  return daysInLocalWeek(weekStart).some(
    (d) => d.getFullYear() === year && d.getMonth() + 1 === month,
  )
}

export function buildReportRecordRows(
  filters: DataRecordsFilterState,
  now = new Date(),
): DataRecordRow[] {
  const { start, end } = resolveDateRange(filters, now)
  const kind = filters.recordKind

  if (kind === 'daily') {
    const rows: DataRecordRow[] = []
    for (const ymd of loadDayKeysWithDailyReports()) {
      if (!ymdInResolvedRange(ymd, start, end)) continue
      const day = parseYmd(ymd)
      if (!day) continue
      for (const entry of loadDailyReportHistory(day)) {
        rows.push(
          reportRowBase('daily', entry.id, entry.createdAt, ymd, '每日日报', entry.text),
        )
      }
    }
    return rows
  }

  if (kind === 'weekly') {
    const rows: DataRecordRow[] = []
    const year = filters.filterYear
    const month = filters.filterMonth
    for (const weekKey of loadWeekKeysWithWeeklyReports()) {
      const weekStart = parseYmd(weekKey)
      if (!weekStart) continue
      if (!ymdInResolvedRange(weekKey, start, end)) continue
      if (!weekMondayInFilterMonth(weekStart, year, month)) continue
      for (const entry of loadWeeklyReportHistory(weekStart)) {
        const created = new Date(entry.createdAt)
        if (!matchesMonthlyWeek(created, filters, now)) continue
        rows.push(
          reportRowBase(
            'weekly',
            entry.id,
            entry.createdAt,
            weekKey,
            '每周周报',
            entry.text,
          ),
        )
      }
    }
    return rows
  }

  if (kind === 'monthly') {
    const rows: DataRecordRow[] = []
    for (const monthKey of loadMonthKeysWithMonthlyReports()) {
      const anchor = parseMonthKey(monthKey)
      if (!anchor) continue
      if (!monthAnchorInResolvedRange(anchor, start, end)) continue
      for (const entry of loadMonthlyReportHistory(anchor)) {
        rows.push(
          reportRowBase(
            'monthly',
            entry.id,
            entry.createdAt,
            toYmdLocal(anchor).slice(0, 7),
            '每月月报',
            entry.text,
          ),
        )
      }
    }
    return rows
  }

  return []
}

export function normalizeFiltersForRecordKind(
  filters: DataRecordsFilterState,
): DataRecordsFilterState {
  const { recordKind } = filters
  let next = { ...filters }
  if (recordKind === 'weekly' || recordKind === 'monthly') {
    next = { ...next, ...normalizeTimeFilterParts({ ...next, filterDay: 0 }) }
  }
  if (recordKind !== 'weekly') {
    next.monthlyWeek = 'any'
  }
  if (recordKind !== 'window') {
    next.categoryIds = []
    next.durationFilter = 'any'
  } else if (!DURATION_FILTER_OPTIONS.some((o) => o.id === next.durationFilter)) {
    next.durationFilter = 'any'
  }
  return next
}
