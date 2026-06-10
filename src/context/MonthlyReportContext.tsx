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
import { MonthlyReportHistoryModal } from '../components/MonthlyReportHistoryModal'
import { MonthlyReportResultModal } from '../components/MonthlyReportResultModal'
import { expandLlmNetworkError } from '../lib/dailyReportChat'
import { assertLlmConfigured, getConfiguredGatewayModel, getLlmInvokeConfig } from '../lib/llmConfig'
import { streamChatCompletion } from '../lib/llmOpenAI'
import { loadMonthlyReportGenerationPrompt } from '../lib/llmUserConfig'
import {
  buildMonthlyReportGenerationUserContent,
  normalizeMonthlyReportTitleDate,
} from '../lib/monthlyReportGeneration'
import {
  loadAutoMonthlyReportFiredKey,
  saveAutoMonthlyReportFiredKey,
  shouldFireAutoMonthlyReport,
} from '../lib/monthlyReportAutoSchedule'
import { appendMonthlyReportHistory } from '../lib/monthlyReportHistoryStore'
import { syncReportToObsidian } from '../lib/obsidianReportExport'
import {
  prefetchMonthlyWindowEvents,
  type MonthlySummary,
} from '../lib/monthlyWorktime'
import { startOfMonthLocal } from '../lib/timeutil'

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

const MonthlyReportContext = createContext<MonthlyReportContextValue | null>(null)

export function MonthlyReportProvider({ children }: { children: ReactNode }) {
  const [monthAnchor, setMonthAnchorRaw] = useState(() => startOfMonthLocal(new Date()))
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [summaryReady, setSummaryReady] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)

  const setMonthAnchor = useCallback((d: Date) => {
    setMonthAnchorRaw(startOfMonthLocal(d))
  }, [])

  const setSummaryState = useCallback((ready: boolean, next: MonthlySummary | null) => {
    setSummaryReady((prev) => (prev === ready ? prev : ready))
    setSummary((prev) => {
      if (next === null) return prev === null ? prev : null
      if (prev?.monthKey === next.monthKey && prev.weekBlocksTotalSeconds === next.weekBlocksTotalSeconds) {
        return prev
      }
      return next
    })
  }, [])

  const closeReportModal = useCallback(() => setReportModalOpen(false), [])
  const openHistoryModal = useCallback(() => setHistoryModalOpen(true), [])
  const closeHistoryModal = useCallback(() => setHistoryModalOpen(false), [])

  const reportStreamingEmpty = streaming && !reportText.trim()

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    prefetchMonthlyWindowEvents(startOfMonthLocal(new Date()))
  }, [])

  const runGenerate = useCallback(async () => {
    const prompt = loadMonthlyReportGenerationPrompt()
    const gatewayModel = getConfiguredGatewayModel()
    const userContent = buildMonthlyReportGenerationUserContent(
      monthAnchor,
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
        const normalized = normalizeMonthlyReportTitleDate(body, monthAnchor)
        setReportText(normalized)
        appendMonthlyReportHistory(monthAnchor, normalized)
        void syncReportToObsidian('monthly', monthAnchor, normalized).then((res) => {
          if (!res.ok && !res.skipped) {
            console.warn('[ganshale] Obsidian 月报导出失败:', res.error)
          }
        })
      }
    }
  }, [monthAnchor])

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
    let lastKey = loadAutoMonthlyReportFiredKey(monthAnchor)
    const id = window.setInterval(() => {
      const now = new Date()
      const { fire, nextKey } = shouldFireAutoMonthlyReport(monthAnchor, now, lastKey)
      if (nextKey && nextKey !== lastKey) {
        lastKey = nextKey
        saveAutoMonthlyReportFiredKey(monthAnchor, nextKey)
      }
      if (fire && !streamingRef.current) {
        onGenerate()
      }
    }, 30_000)
    return () => window.clearInterval(id)
  }, [monthAnchor, onGenerate])

  const value = useMemo<MonthlyReportContextValue>(
    () => ({
      monthAnchor,
      setMonthAnchor,
      summary,
      summaryReady,
      setSummaryState,
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
      monthAnchor,
      setMonthAnchor,
      summary,
      summaryReady,
      setSummaryState,
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
    <MonthlyReportContext.Provider value={value}>
      {children}
      <MonthlyReportResultModal
        open={reportModalOpen}
        monthAnchor={monthAnchor}
        text={reportText}
        streaming={streaming}
        reportStreamingEmpty={reportStreamingEmpty}
        onClose={closeReportModal}
        onCopyToast={setToast}
        onStop={onStop}
      />
      <MonthlyReportHistoryModal
        open={historyModalOpen}
        monthAnchor={monthAnchor}
        onClose={closeHistoryModal}
        onCopyToast={setToast}
      />
    </MonthlyReportContext.Provider>
  )
}

export function useMonthlyReport(): MonthlyReportContextValue {
  const ctx = useContext(MonthlyReportContext)
  if (!ctx) throw new Error('useMonthlyReport must be used within MonthlyReportProvider')
  return ctx
}

export function useMonthlyReportOptional(): MonthlyReportContextValue | null {
  return useContext(MonthlyReportContext)
}
