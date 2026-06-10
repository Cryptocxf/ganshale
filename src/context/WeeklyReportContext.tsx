import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { expandLlmNetworkError } from '../lib/dailyReportChat'
import { assertLlmConfigured, getConfiguredGatewayModel, getLlmInvokeConfig } from '../lib/llmConfig'
import { streamChatCompletion } from '../lib/llmOpenAI'
import { loadWeeklyReportGenerationPrompt } from '../lib/llmUserConfig'
import {
  loadAutoWeeklyReportFiredKey,
  saveAutoWeeklyReportFiredKey,
  shouldFireAutoWeeklyReport,
} from '../lib/weeklyReportAutoSchedule'
import {
  buildWeeklyReportGenerationUserContent,
  normalizeWeeklyReportTitleDate,
} from '../lib/weeklyReportGeneration'
import { appendWeeklyReportHistory } from '../lib/weeklyReportHistoryStore'
import { syncReportToObsidian } from '../lib/obsidianReportExport'
import { startOfWeekMondayLocal } from '../lib/timeutil'
import { WeeklyReportHistoryModal } from '../components/WeeklyReportHistoryModal'
import { WeeklyReportResultModal } from '../components/WeeklyReportResultModal'

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

const WeeklyReportContext = createContext<WeeklyReportContextValue | null>(null)

export function WeeklyReportProvider({ children }: { children: ReactNode }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMondayLocal(new Date()))
  const [streaming, setStreaming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)

  const closeReportModal = useCallback(() => setReportModalOpen(false), [])
  const openHistoryModal = useCallback(() => setHistoryModalOpen(true), [])
  const closeHistoryModal = useCallback(() => setHistoryModalOpen(false), [])

  const reportStreamingEmpty = streaming && !reportText.trim()

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const runGenerate = useCallback(async () => {
    const prompt = loadWeeklyReportGenerationPrompt()
    const gatewayModel = getConfiguredGatewayModel()
    const userContent = buildWeeklyReportGenerationUserContent(
      weekStart,
      prompt,
      gatewayModel,
    )
    assertLlmConfigured()
    const { baseUrl, apiKey, model } = getLlmInvokeConfig()

    let acc = ''
    let aborted = false
    try {
      await streamChatCompletion({
        baseUrl,
        apiKey,
        model,
        messages: [{ role: 'user', content: userContent }],
        signal: abortRef.current?.signal,
        onDelta: (d) => {
          acc += d
          flushSync(() => setReportText(acc))
        },
      })
    } catch (e) {
      aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError')
      if (aborted) return
      const msg = expandLlmNetworkError(e instanceof Error ? e.message : String(e))
      setToast(msg)
      window.setTimeout(() => setToast(null), 5000)
      if (!acc.trim()) {
        setReportText(`（请求失败：${msg}）`)
      }
    } finally {
      streamingRef.current = false
      setStreaming(false)
      abortRef.current = null
      const body = acc.trim()
      if (body && !aborted) {
        const normalized = normalizeWeeklyReportTitleDate(body, weekStart)
        setReportText(normalized)
        appendWeeklyReportHistory(weekStart, normalized)
        void syncReportToObsidian('weekly', weekStart, normalized).then((res) => {
          if (!res.ok && !res.skipped) {
            console.warn('[ganshale] Obsidian 周报导出失败:', res.error)
          }
        })
      }
    }
  }, [weekStart])

  const onGenerate = useCallback(() => {
    if (streamingRef.current) return
    setReportModalOpen(true)
    setReportText('')
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    streamingRef.current = true
    setStreaming(true)
    void runGenerate()
  }, [runGenerate])

  const onStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  useEffect(() => {
    let lastKey = loadAutoWeeklyReportFiredKey(weekStart)
    const id = window.setInterval(() => {
      const now = new Date()
      const { fire, nextKey } = shouldFireAutoWeeklyReport(weekStart, now, lastKey)
      if (nextKey && nextKey !== lastKey) {
        lastKey = nextKey
        saveAutoWeeklyReportFiredKey(weekStart, nextKey)
      }
      if (fire && !streamingRef.current) {
        onGenerate()
      }
    }, 30_000)
    return () => window.clearInterval(id)
  }, [weekStart, onGenerate])

  const value = useMemo<WeeklyReportContextValue>(
    () => ({
      weekStart,
      setWeekStart,
      streaming,
      toast,
      reportText,
      reportStreamingEmpty,
      reportModalOpen,
      closeReportModal,
      historyModalOpen,
      openHistoryModal,
      closeHistoryModal,
      onGenerate,
      onStop,
    }),
    [
      weekStart,
      streaming,
      toast,
      reportText,
      reportStreamingEmpty,
      reportModalOpen,
      closeReportModal,
      historyModalOpen,
      openHistoryModal,
      closeHistoryModal,
      onGenerate,
      onStop,
    ],
  )

  return (
    <WeeklyReportContext.Provider value={value}>
      {children}
      <WeeklyReportResultModal
        open={reportModalOpen}
        weekStart={weekStart}
        text={reportText}
        streaming={streaming}
        reportStreamingEmpty={reportStreamingEmpty}
        onClose={closeReportModal}
        onCopyToast={setToast}
        onStop={onStop}
      />
      <WeeklyReportHistoryModal
        open={historyModalOpen}
        weekStart={weekStart}
        onClose={closeHistoryModal}
        onCopyToast={setToast}
      />
    </WeeklyReportContext.Provider>
  )
}

export function useWeeklyReport(): WeeklyReportContextValue {
  const ctx = useContext(WeeklyReportContext)
  if (!ctx) throw new Error('useWeeklyReport must be used within WeeklyReportProvider')
  return ctx
}

export function useWeeklyReportOptional(): WeeklyReportContextValue | null {
  return useContext(WeeklyReportContext)
}
