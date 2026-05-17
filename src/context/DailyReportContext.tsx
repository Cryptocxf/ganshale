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
import {
  type DailyReportPromptPresetId,
  loadDailyReportPrefs,
  saveDailyReportPrefs,
} from '../lib/dailyReportPrefs'
import {
  expandLlmNetworkError,
  extraStorageKey,
  loadChatLines,
  saveChatLines,
  toApiMessages,
  type ChatLine,
} from '../lib/dailyReportChat'
import {
  gatewayModelToUiModelId,
  getConfiguredGatewayModel,
  getLlmInvokeConfig,
} from '../lib/llmConfig'
import { streamChatCompletion } from '../lib/llmOpenAI'
import {
  loadAutoDailyReportFiredKey,
  saveAutoDailyReportFiredKey,
  shouldFireAutoDailyReportAt18,
} from '../lib/dailyReportAutoSchedule'
import { buildWorkRecordBlock, loadWorkRecords } from '../lib/workRecordStore'
import { loadDailyReportGenerationPrompt } from '../lib/llmUserConfig'
import { useGanshaleData } from './useGanshaleData'
import { DailyReportResultModal } from '../components/DailyReportResultModal'

const ATTACH_CONTEXT_STORAGE_KEY = 'ganshale-daily-report-attach-context-v1'

function loadAttachDailyContext(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(ATTACH_CONTEXT_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

function saveAttachDailyContext(value: boolean) {
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
  openReportModal: () => void
  closeReportModal: () => void
  onGenerate: () => void
  onAskOnly: () => void
  onStop: () => void
  selectedPromptFull: string
}

const DailyReportContext = createContext<DailyReportContextValue | null>(null)

export function DailyReportProvider({ children }: { children: ReactNode }) {
  const { day } = useGanshaleData()

  const initial = loadDailyReportPrefs()
  const [promptPresetId, setPromptPresetId] = useState<DailyReportPromptPresetId>(
    initial.promptPresetId,
  )
  const [promptConcise, setPromptConcise] = useState(initial.promptConcise)
  const [promptDetailed, setPromptDetailed] = useState(initial.promptDetailed)
  const [messages, setMessages] = useState<ChatLine[]>([])
  const [extraNote, setExtraNote] = useState('')
  const [attachDailyContext, setAttachDailyContext] = useState(loadAttachDailyContext)
  const [streaming, setStreaming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)

  const openReportModal = useCallback(() => setReportModalOpen(true), [])
  const closeReportModal = useCallback(() => setReportModalOpen(false), [])

  useEffect(() => {
    const p = loadDailyReportPrefs()
    setPromptPresetId(p.promptPresetId)
    setPromptConcise(p.promptConcise)
    setPromptDetailed(p.promptDetailed)
  }, [])

  useEffect(() => {
    try {
      setMessages(loadChatLines(day))
      setExtraNote(sessionStorage.getItem(extraStorageKey(day)) ?? '')
    } catch {
      setMessages([])
      setExtraNote('')
    }
  }, [day])

  useEffect(() => {
    saveChatLines(day, messages)
  }, [day, messages])

  useEffect(() => {
    try {
      sessionStorage.setItem(extraStorageKey(day), extraNote)
    } catch {
      /* ignore */
    }
  }, [day, extraNote])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const selectedPromptFull = useMemo(
    () => (promptPresetId === 'concise' ? promptConcise : promptDetailed),
    [promptPresetId, promptConcise, promptDetailed],
  )

  const latestReportText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'assistant' && m.content.trim()) return m.content
    }
    return ''
  }, [messages])

  const reportStreamingEmpty =
    streaming &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    messages[messages.length - 1]?.content === ''

  const runStream = useCallback(async (snapshotAfterUserAndPlaceholder: ChatLine[]) => {
    const { baseUrl, apiKey, model } = getLlmInvokeConfig()
    const apiMessages = toApiMessages(snapshotAfterUserAndPlaceholder)
    const assistantId = snapshotAfterUserAndPlaceholder[snapshotAfterUserAndPlaceholder.length - 1]?.id

    let acc = ''
    try {
      await streamChatCompletion({
        baseUrl,
        apiKey,
        model,
        messages: apiMessages,
        signal: abortRef.current?.signal,
        onDelta: (d) => {
          acc += d
          if (!assistantId) return
          flushSync(() => {
            setMessages((prev) => {
              const out = [...prev]
              const idx = out.findIndex((m) => m.id === assistantId)
              if (idx >= 0) {
                out[idx] = { ...out[idx], content: acc }
              }
              return out
            })
          })
        },
      })
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError')
      if (aborted) return
      const msg = expandLlmNetworkError(e instanceof Error ? e.message : String(e))
      if (assistantId) {
        setMessages((prev) => {
          const out = [...prev]
          const idx = out.findIndex((m) => m.id === assistantId)
          if (idx >= 0) {
            out[idx] = {
              ...out[idx],
              content: acc ? `${acc}\n\n（流式中断：${msg}）` : `（请求失败：${msg}）`,
            }
          }
          return out
        })
      }
      setToast(msg)
      window.setTimeout(() => setToast(null), 5000)
    } finally {
      streamingRef.current = false
      setStreaming(false)
      abortRef.current = null
    }
  }, [])

  const onGenerate = useCallback(() => {
    if (streamingRef.current) return
    setReportModalOpen(true)

    const prompt = loadDailyReportGenerationPrompt()
    const workBlock = buildWorkRecordBlock(loadWorkRecords(day))
    const gatewayModel = getConfiguredGatewayModel()

    const userContent = [
      '【提示词】',
      prompt,
      '',
      '---',
      '【今日工作记录】',
      workBlock,
      '',
      `【使用模型】网关 model：${gatewayModel}`,
    ].join('\n')

    const uiModelId = gatewayModelToUiModelId(gatewayModel)
    const userMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: '请根据提示词与今日工作记录，生成一份日报。',
      apiContent: userContent,
      createdAt: new Date().toISOString(),
    }
    const asstMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      modelId: uiModelId,
    }

    const next = [userMsg, asstMsg]

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    streamingRef.current = true
    setStreaming(true)
    setMessages(next)
    void runStream(next)
  }, [day, runStream])

  const onAskOnly = useCallback(() => {
    const text = extraNote.trim()
    if (!text || streamingRef.current) return

    const gatewayModel = getConfiguredGatewayModel()
    const uiModelId = gatewayModelToUiModelId(gatewayModel)

    const userMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    const asstMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      modelId: uiModelId,
    }
    setExtraNote('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    streamingRef.current = true
    setStreaming(true)

    setMessages((prev) => {
      const next = [...prev, userMsg, asstMsg]
      void runStream(next)
      return next
    })
  }, [extraNote, runStream])

  const onStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const onPresetChange = useCallback((id: DailyReportPromptPresetId) => {
    setPromptPresetId(id)
    saveDailyReportPrefs({ promptPresetId: id })
  }, [])

  const applyDailyReportSettings = useCallback(
    (partial: {
      promptPresetId: DailyReportPromptPresetId
      promptConcise: string
      promptDetailed: string
    }) => {
      setPromptPresetId(partial.promptPresetId)
      setPromptConcise(partial.promptConcise)
      setPromptDetailed(partial.promptDetailed)
      saveDailyReportPrefs(partial)
    },
    [],
  )

  const onAttachDailyContextChange = useCallback((checked: boolean) => {
    setAttachDailyContext(checked)
    saveAttachDailyContext(checked)
  }, [])

  /** 每天 18:00 自动触发生成日报（与手动点击相同流程） */
  useEffect(() => {
    let lastKey = loadAutoDailyReportFiredKey(day)
    const id = window.setInterval(() => {
      const now = new Date()
      const { fire, nextKey } = shouldFireAutoDailyReportAt18(day, now, lastKey)
      if (nextKey && nextKey !== lastKey) {
        lastKey = nextKey
        saveAutoDailyReportFiredKey(day, nextKey)
      }
      if (fire && !streamingRef.current) {
        onGenerate()
      }
    }, 30_000)
    return () => window.clearInterval(id)
  }, [day, onGenerate])

  const value = useMemo<DailyReportContextValue>(
    () => ({
      promptPresetId,
      promptConcise,
      promptDetailed,
      streaming,
      toast,
      latestReportText,
      reportStreamingEmpty,
      extraNote,
      setExtraNote,
      attachDailyContext,
      onPresetChange,
      applyDailyReportSettings,
      onAttachDailyContextChange,
      reportModalOpen,
      openReportModal,
      closeReportModal,
      onGenerate,
      onAskOnly,
      onStop,
      selectedPromptFull,
    }),
    [
      promptPresetId,
      promptConcise,
      promptDetailed,
      streaming,
      toast,
      latestReportText,
      reportStreamingEmpty,
      extraNote,
      attachDailyContext,
      onPresetChange,
      applyDailyReportSettings,
      onAttachDailyContextChange,
      reportModalOpen,
      openReportModal,
      closeReportModal,
      onGenerate,
      onAskOnly,
      onStop,
      selectedPromptFull,
    ],
  )

  return (
    <DailyReportContext.Provider value={value}>
      {children}
      <DailyReportResultModal
        open={reportModalOpen}
        day={day}
        text={latestReportText}
        streaming={streaming}
        reportStreamingEmpty={reportStreamingEmpty}
        onClose={closeReportModal}
        onCopyToast={setToast}
      />
    </DailyReportContext.Provider>
  )
}

export function useDailyReport() {
  const ctx = useContext(DailyReportContext)
  if (!ctx) {
    throw new Error('useDailyReport must be used within DailyReportProvider')
  }
  return ctx
}

/** 供设置页等可选使用 */
export function useDailyReportOptional() {
  return useContext(DailyReportContext)
}
