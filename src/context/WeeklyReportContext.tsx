import {
createContext,
useContext
} from 'react'

export type WeeklyReportContextValue = {
  weekStart: Date
  setWeekStart: (d: Date) => void
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

export const WeeklyReportContext = createContext<WeeklyReportContextValue | null>(null)

export function useWeeklyReport(): WeeklyReportContextValue {
  const ctx = useContext(WeeklyReportContext)
  if (!ctx) throw new Error('useWeeklyReport must be used within WeeklyReportProvider')
  return ctx
}

export function useWeeklyReportOptional(): WeeklyReportContextValue | null {
  return useContext(WeeklyReportContext)
}
