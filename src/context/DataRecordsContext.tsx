import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AwEvent } from '../lib/awTypes'
import { APP_CATEGORY_CONFIG_CHANGED_EVENT } from '../lib/appCategoryConfig'
import {
  buildCategoryFilterOptions,
  buildReportRecordRows,
  buildRowsFromEvents,
  dataFetchKey,
  daysInFilterMonth,
  defaultDataRecordsFilters,
  filterDataRecordRows,
  normalizeFiltersForRecordKind,
  normalizeTimeFilterParts,
  paginateRows,
  resolveDateRange,
  sortDataRecordRows,
  sumDurationSec,
  type DataRecordKind,
  type DataRecordRow,
  type DataRecordsFilterState,
  type SortField,
} from '../lib/dataRecordsQuery'
import { exportDataRecordsCsv } from '../lib/dataRecordsExport'
import { DAILY_REPORT_HISTORY_CHANGED_EVENT } from '../lib/dailyReportHistoryStore'
import { MONTHLY_REPORT_HISTORY_CHANGED_EVENT } from '../lib/monthlyReportHistoryStore'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'
import * as store from '../lib/idbStore'
import { BUCKET_WINDOW } from '../lib/seed'
import { WEEKLY_REPORT_HISTORY_CHANGED_EVENT } from '../lib/weeklyReportHistoryStore'

export type DataRecordsContextValue = {
  draftFilters: DataRecordsFilterState
  appliedFilters: DataRecordsFilterState
  appSearchDraft: string
  setAppSearchDraft: (v: string) => void
  loading: boolean
  categoryOptions: { id: string; label: string }[]
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  detailRow: DataRecordRow | null
  setDetailRow: (row: DataRecordRow | null) => void
  jumpPage: string
  setJumpPage: (v: string) => void
  years: number[]
  dayOptions: number[]
  filteredRows: DataRecordRow[]
  pageRows: DataRecordRow[]
  pageCount: number
  totalDuration: number
  patchDraft: (patch: Partial<DataRecordsFilterState>) => void
  patchTimeDraft: (
    patch: Partial<Pick<DataRecordsFilterState, 'filterYear' | 'filterMonth' | 'filterDay'>>,
  ) => void
  patchApplied: (patch: Partial<DataRecordsFilterState>) => void
  patchRecordKind: (recordKind: DataRecordKind) => void
  toggleSort: (field: SortField) => void
  toggleCategory: (id: string) => void
  onApplyFilters: () => void
  onAppSearch: () => void
  exportSelected: () => void
  exportDisabled: boolean
}

const DataRecordsContext = createContext<DataRecordsContextValue | null>(null)

function yearOptions(now: Date): number[] {
  const y = now.getFullYear()
  return Array.from({ length: 8 }, (_, i) => y - i)
}

export function DataRecordsProvider({ children }: { children: ReactNode }) {
  const [draftFilters, setDraftFilters] = useState<DataRecordsFilterState>(() =>
    defaultDataRecordsFilters(),
  )
  const [appliedFilters, setAppliedFilters] = useState<DataRecordsFilterState>(() =>
    defaultDataRecordsFilters(),
  )
  const [appSearchDraft, setAppSearchDraft] = useState('')
  const [windowEvents, setWindowEvents] = useState<AwEvent[]>([])
  const [reportRefresh, setReportRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoryOptions, setCategoryOptions] = useState(() => buildCategoryFilterOptions())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [detailRow, setDetailRow] = useState<DataRecordRow | null>(null)
  const [jumpPage, setJumpPage] = useState('1')

  const now = useMemo(() => new Date(), [])
  const years = useMemo(() => yearOptions(now), [now])

  const patchDraft = useCallback((patch: Partial<DataRecordsFilterState>) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const patchTimeDraft = useCallback(
    (patch: Partial<Pick<DataRecordsFilterState, 'filterYear' | 'filterMonth' | 'filterDay'>>) => {
      setDraftFilters((prev) => ({
        ...prev,
        ...normalizeTimeFilterParts({ ...prev, ...patch }),
      }))
    },
    [],
  )

  const dayOptions = useMemo(() => {
    const { filterYear, filterMonth } = draftFilters
    if (!filterYear || !filterMonth) return []
    const n = daysInFilterMonth(filterYear, filterMonth)
    return Array.from({ length: n }, (_, i) => i + 1)
  }, [draftFilters.filterYear, draftFilters.filterMonth])

  const patchApplied = useCallback((patch: Partial<DataRecordsFilterState>) => {
    setAppliedFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }))
  }, [])

  const toggleSort = useCallback((field: SortField) => {
    setAppliedFilters((prev) => {
      if (prev.sortField === field) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === 'desc' ? 'asc' : 'desc',
          page: 1,
        }
      }
      return { ...prev, sortField: field, sortDirection: 'desc', page: 1 }
    })
  }, [])

  const patchRecordKind = useCallback((recordKind: DataRecordKind) => {
    setDraftFilters((prev) => normalizeFiltersForRecordKind({ ...prev, recordKind }))
  }, [])

  useEffect(() => {
    const bump = () => setReportRefresh((n) => n + 1)
    window.addEventListener(DAILY_REPORT_HISTORY_CHANGED_EVENT, bump)
    window.addEventListener(WEEKLY_REPORT_HISTORY_CHANGED_EVENT, bump)
    window.addEventListener(MONTHLY_REPORT_HISTORY_CHANGED_EVENT, bump)
    return () => {
      window.removeEventListener(DAILY_REPORT_HISTORY_CHANGED_EVENT, bump)
      window.removeEventListener(WEEKLY_REPORT_HISTORY_CHANGED_EVENT, bump)
      window.removeEventListener(MONTHLY_REPORT_HISTORY_CHANGED_EVENT, bump)
    }
  }, [])

  useEffect(() => {
    const syncCats = () => setCategoryOptions(buildCategoryFilterOptions())
    window.addEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, syncCats)
    return () => {
      window.removeEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, syncCats)
    }
  }, [])

  const fetchKey = dataFetchKey(appliedFilters)

  useEffect(() => {
    if (appliedFilters.recordKind !== 'window') return
    let cancelled = false
    setLoading(true)
    const { start, end } = resolveDateRange(appliedFilters)
    void store
      .getEventsInRange(BUCKET_WINDOW, start.toISOString(), end.toISOString())
      .then((raw) => excludeGanshaleSelfWindowEvents(raw))
      .then((evs) => {
        if (!cancelled) setWindowEvents(evs)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchKey, appliedFilters.recordKind])

  useEffect(() => {
    if (appliedFilters.recordKind !== 'window') setLoading(false)
  }, [appliedFilters.recordKind, fetchKey, reportRefresh])

  const sourceRows = useMemo(() => {
    if (appliedFilters.recordKind === 'window') {
      return buildRowsFromEvents(windowEvents)
    }
    void reportRefresh
    return buildReportRecordRows(appliedFilters)
  }, [windowEvents, appliedFilters, reportRefresh])

  const filteredRows = useMemo(() => {
    const filtered = filterDataRecordRows(sourceRows, appliedFilters)
    return sortDataRecordRows(filtered, appliedFilters.sortField, appliedFilters.sortDirection)
  }, [sourceRows, appliedFilters])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / appliedFilters.pageSize))
  const pageRows = useMemo(
    () => paginateRows(filteredRows, appliedFilters.page, appliedFilters.pageSize),
    [filteredRows, appliedFilters.page, appliedFilters.pageSize],
  )

  useEffect(() => {
    setAppliedFilters((prev) => (prev.page > pageCount ? { ...prev, page: pageCount } : prev))
  }, [pageCount])

  useEffect(() => {
    setJumpPage(String(appliedFilters.page))
  }, [appliedFilters.page])

  const totalDuration = sumDurationSec(filteredRows)

  const onApplyFilters = useCallback(() => {
    const next = normalizeFiltersForRecordKind({ ...draftFilters, page: 1 })
    setDraftFilters(next)
    setAppliedFilters((prev) => ({ ...next, appSearchQuery: prev.appSearchQuery }))
    setSelectedIds(new Set())
  }, [draftFilters])

  const onAppSearch = useCallback(() => {
    const query = appSearchDraft.trim()
    setAppliedFilters((prev) => ({ ...prev, appSearchQuery: query, page: 1 }))
    setSelectedIds(new Set())
  }, [appSearchDraft])

  const toggleCategory = useCallback((id: string) => {
    setDraftFilters((prev) => {
      const has = prev.categoryIds.includes(id)
      const categoryIds = has
        ? prev.categoryIds.filter((x) => x !== id)
        : [...prev.categoryIds, id]
      return { ...prev, categoryIds }
    })
  }, [])

  const exportSelected = useCallback(() => {
    const rows = filteredRows.filter((r) => selectedIds.has(r.event.id))
    if (rows.length === 0) return
    exportDataRecordsCsv(rows, appliedFilters.recordKind)
  }, [filteredRows, selectedIds, appliedFilters.recordKind])

  const value = useMemo<DataRecordsContextValue>(
    () => ({
      draftFilters,
      appliedFilters,
      appSearchDraft,
      setAppSearchDraft,
      loading,
      categoryOptions,
      selectedIds,
      setSelectedIds,
      detailRow,
      setDetailRow,
      jumpPage,
      setJumpPage,
      years,
      dayOptions,
      filteredRows,
      pageRows,
      pageCount,
      totalDuration,
      patchDraft,
      patchTimeDraft,
      patchApplied,
      patchRecordKind,
      toggleSort,
      toggleCategory,
      onApplyFilters,
      onAppSearch,
      exportSelected,
      exportDisabled: selectedIds.size === 0,
    }),
    [
      draftFilters,
      appliedFilters,
      appSearchDraft,
      loading,
      categoryOptions,
      selectedIds,
      detailRow,
      jumpPage,
      years,
      dayOptions,
      filteredRows,
      pageRows,
      pageCount,
      totalDuration,
      patchDraft,
      patchTimeDraft,
      patchApplied,
      patchRecordKind,
      toggleSort,
      toggleCategory,
      onApplyFilters,
      onAppSearch,
      exportSelected,
    ],
  )

  return <DataRecordsContext.Provider value={value}>{children}</DataRecordsContext.Provider>
}

export function useDataRecords(): DataRecordsContextValue {
  const ctx = useContext(DataRecordsContext)
  if (!ctx) throw new Error('useDataRecords must be used within DataRecordsProvider')
  return ctx
}

export function useDataRecordsOptional(): DataRecordsContextValue | null {
  return useContext(DataRecordsContext)
}
