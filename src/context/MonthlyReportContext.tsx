import {
createContext,
useContext
} from 'react'
import {
type MonthlySummary
} from '../lib/monthlyWorktime'

export type MonthlyReportContextValue = {
  monthAnchor: Date
  setMonthAnchor: (d: Date) => void
  summary: MonthlySummary | null
  summaryReady: boolean
  setSummaryState: (ready: boolean, summary: MonthlySummary | null) => void
  streaming: boolean
  toast: string | null
  reportText: string
  reportStreamingEmpty: boolean
  reportModalOpen: boolean
  closeReportModal: () => void
  historyModalOpen: boolean
  openHistoryModal: () => void
  closeHistoryModal: () => void
  onGenerate: () => void
  onStop: () => void
}

export const MonthlyReportContext = createContext<MonthlyReportContextValue | null>(null)

export function useMonthlyReport(): MonthlyReportContextValue {
  const ctx = useContext(MonthlyReportContext)
  if (!ctx) throw new Error('useMonthlyReport must be used within MonthlyReportProvider')
  return ctx
}

export function useMonthlyReportOptional(): MonthlyReportContextValue | null {
  return useContext(MonthlyReportContext)
}
