import {
createContext,
useContext
} from 'react'
import {
type DataRecordKind,
type DataRecordRow,
type DataRecordsFilterState,
type SortField
} from '../lib/dataRecordsQuery'

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

export const DataRecordsContext = createContext<DataRecordsContextValue | null>(null)

export function yearOptions(now: Date): number[] {
  const y = now.getFullYear()
  return Array.from({ length: 8 }, (_, i) => y - i)
}

export function useDataRecords(): DataRecordsContextValue {
  const ctx = useContext(DataRecordsContext)
  if (!ctx) throw new Error('useDataRecords must be used within DataRecordsProvider')
  return ctx
}

export function useDataRecordsOptional(): DataRecordsContextValue | null {
  return useContext(DataRecordsContext)
}
