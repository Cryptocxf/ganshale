import {
useCallback,
useEffect,
useMemo,
useState,
type ReactNode
} from 'react'
import { APP_CATEGORY_CONFIG_CHANGED_EVENT } from '../lib/appCategoryConfig'
import type { AwEvent } from '../lib/awTypes'
import { DAILY_REPORT_HISTORY_CHANGED_EVENT } from '../lib/dailyReportHistoryStore'
import { APP_DATA_CHANGED_EVENT } from '../lib/dataManagement'
import { exportDataRecordsCsv } from '../lib/dataRecordsExport'
import {
buildCategoryFilterOptions,
buildReportRecordRows,
buildRowsFromEvents,
dataFetchKey,
daysInFilterMonth,
defaultDataRecordsFilters,
filterDataRecordRows,
initialFiltersForRecordKind,
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
import * as store from '../lib/idbStore'
import { MONTHLY_REPORT_HISTORY_CHANGED_EVENT } from '../lib/monthlyReportHistoryStore'
import { BUCKET_WINDOW } from '../lib/seed'
import { excludeGanshaleSelfWindowEvents } from '../lib/selfWindowFilter'
import { WEEKLY_REPORT_HISTORY_CHANGED_EVENT } from '../lib/weeklyReportHistoryStore'
import { DataRecordsContext,type DataRecordsContextValue,yearOptions } from './DataRecordsContext'

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
  const [dataRevision, setDataRevision] = useState(0)
  const [settledRequest, setSettledRequest] = useState('')
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
    const filterYear = draftFilters.filterYear, filterMonth = draftFilters.filterMonth
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
    const next = initialFiltersForRecordKind(recordKind)
    setDraftFilters(next)
    setAppliedFilters(next)
    setAppSearchDraft('')
    setSelectedIds(new Set())
    setDetailRow(null)
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
    const onDataChanged = () => {
      setWindowEvents([])
      setReportRefresh((n) => n + 1)
      setDataRevision((n) => n + 1)
      setSelectedIds(new Set())
      setDetailRow(null)
    }
    window.addEventListener(APP_DATA_CHANGED_EVENT, onDataChanged)
    return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, onDataChanged)
  }, [])

  useEffect(() => {
    const syncCats = () => setCategoryOptions(buildCategoryFilterOptions())
    window.addEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, syncCats)
    return () => {
      window.removeEventListener(APP_CATEGORY_CONFIG_CHANGED_EVENT, syncCats)
    }
  }, [])

  const fetchKey = dataFetchKey(appliedFilters)
  const requestKey = `${fetchKey}:${dataRevision}`
  const loading = appliedFilters.recordKind === 'window' && settledRequest !== requestKey

  useEffect(() => {
    const [kind,year,month,day] = fetchKey.split('|')
    if (kind !== 'window') return
    let cancelled = false
    const { start, end } = resolveDateRange({filterYear:Number(year),filterMonth:Number(month),filterDay:Number(day)})
    void store
      .getEventsInRange(BUCKET_WINDOW, start.toISOString(), end.toISOString())
      .then((raw) => excludeGanshaleSelfWindowEvents(raw))
      .then((evs) => {
        if (!cancelled) setWindowEvents(evs)
      })
      .catch(() => { if(!cancelled)setWindowEvents([]) })
      .finally(() => {
        if (!cancelled) setSettledRequest(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [fetchKey, requestKey])

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

  if(appliedFilters.page>pageCount){setAppliedFilters({...appliedFilters,page:pageCount})}
  const [previousPage,setPreviousPage]=useState(appliedFilters.page)
  if(previousPage!==appliedFilters.page){setPreviousPage(appliedFilters.page);setJumpPage(String(appliedFilters.page))}

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
