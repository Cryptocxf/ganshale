import {
createContext,
useContext
} from 'react'
import {
type DailyReportPromptPresetId
} from '../lib/dailyReportPrefs'

export const ATTACH_CONTEXT_STORAGE_KEY = 'ganshale-daily-report-attach-context-v1'

export function loadAttachDailyContext(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(ATTACH_CONTEXT_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveAttachDailyContext(value: boolean) {
  try {
    localStorage.setItem(ATTACH_CONTEXT_STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export type DailyReportContextValue = {
  promptPresetId: DailyReportPromptPresetId
  promptConcise: string
  promptDetailed: string
  streaming: boolean
  toast: string | null
  latestReportText: string
  reportStreamingEmpty: boolean
  extraNote: string
  setExtraNote: (v: string) => void
  attachDailyContext: boolean
  onPresetChange: (id: DailyReportPromptPresetId) => void
  applyDailyReportSettings: (partial: {
    promptPresetId: DailyReportPromptPresetId
    promptConcise: string
    promptDetailed: string
  }) => void
  onAttachDailyContextChange: (checked: boolean) => void
  reportModalOpen: boolean
  closeReportModal: () => void
  historyModalOpen: boolean
  openHistoryModal: () => void
  closeHistoryModal: () => void
  onGenerate: () => void
  onAskOnly: () => void
  onStop: () => void
  selectedPromptFull: string
}

export const DailyReportContext = createContext<DailyReportContextValue | null>(null)

export function useDailyReport() {
  const ctx = useContext(DailyReportContext)
  if (!ctx) {
    throw new Error('useDailyReport must be used within DailyReportProvider')
  }
  return ctx
}

export function useDailyReportOptional() {
  return useContext(DailyReportContext)
}
