import {
useCallback,
useEffect,
useMemo,
useRef,
useState,
type ReactNode
} from 'react'
import { flushSync } from 'react-dom'
import { DailyReportHistoryModal } from '../components/DailyReportHistoryModal'
import { DailyReportResultModal } from '../components/DailyReportResultModal'
import {
claimAutoDailyReportAttempt,
loadAutoDailyReportFiredSlots,
saveAutoDailyReportFiredSlots,
shouldFireAutoDailyReport,
} from '../lib/dailyReportAutoSchedule'
import {
expandLlmNetworkError,
extraStorageKey,
loadChatLines,
saveChatLines,
toApiMessages,
type ChatLine,
} from '../lib/dailyReportChat'
import {
buildDailyReportGenerationUserContent,
normalizeDailyReportTitleDate,
} from '../lib/dailyReportGeneration'
import { appendDailyReportHistory } from '../lib/dailyReportHistoryStore'
import {
loadDailyReportPrefs,
saveDailyReportPrefs,
type DailyReportPromptPresetId,
} from '../lib/dailyReportPrefs'
import {
assertLlmConfigured,
gatewayModelToUiModelId,
getConfiguredGatewayModel,
getLlmInvokeConfig,
} from '../lib/llmConfig'
import { streamChatCompletion } from '../lib/llmOpenAI'
import { loadDailyReportGenerationPrompt } from '../lib/llmUserConfig'
import { LOCAL_MIDNIGHT_EVENT } from '../lib/localMidnight'
import { syncReportToObsidian } from '../lib/obsidianReportExport'
import { buildWorkRecordBlock,loadWorkRecords } from '../lib/workRecordStore'
import { DailyReportContext,type DailyReportContextValue,loadAttachDailyContext,saveAttachDailyContext } from './DailyReportContext'
import { useGanshaleData } from './useGanshaleData'

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
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)

  const closeReportModal = useCallback(() => setReportModalOpen(false), [])
  const openHistoryModal = useCallback(() => setHistoryModalOpen(true), [])
  const closeHistoryModal = useCallback(() => setHistoryModalOpen(false), [])

  const chatDayKey = day.getTime()
  const [previousChatDay, setPreviousChatDay] = useState<number | null>(null)
  if(previousChatDay!==chatDayKey){
    setPreviousChatDay(chatDayKey)
    try {
      setMessages(loadChatLines(day))
      setExtraNote(sessionStorage.getItem(extraStorageKey(day)) ?? '')
    } catch {
      setMessages([])
      setExtraNote('')
    }
  }

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

  useEffect(() => {
    const onMidnight = () => {
      abortRef.current?.abort()
      streamingRef.current = false
      setStreaming(false)
      setReportModalOpen(false)
    }
    window.addEventListener(LOCAL_MIDNIGHT_EVENT, onMidnight)
    return () => window.removeEventListener(LOCAL_MIDNIGHT_EVENT, onMidnight)
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

  const runStream = useCallback(
    async (
      snapshotAfterUserAndPlaceholder: ChatLine[],
      opts?: { saveToHistory?: boolean },
    ) => {
    assertLlmConfigured()
    const { baseUrl, apiKey, model } = getLlmInvokeConfig()
    const apiMessages = toApiMessages(snapshotAfterUserAndPlaceholder)
    const assistantId = snapshotAfterUserAndPlaceholder[snapshotAfterUserAndPlaceholder.length - 1]?.id

    let acc = ''
    let aborted = false
    let completed = false
    try {
      await streamChatCompletion({
        baseUrl,
        apiKey,
        model,
        messages: apiMessages,
        signal: abortRef.current ? AbortSignal.any([abortRef.current.signal, AbortSignal.timeout(180_000)]) : AbortSignal.timeout(180_000),
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
      completed = true
    } catch (e) {
      aborted =
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
      const body = acc.trim()
      if (body && !aborted && completed) {
        const normalized = normalizeDailyReportTitleDate(body, day)
        if (opts?.saveToHistory) {
          appendDailyReportHistory(day, normalized)
          void syncReportToObsidian('daily', day, normalized).then((res) => {
            if (res.skipped) return
            if (!res.ok) {
              const msg = `Obsidian 导出失败：${res.error ?? '未知错误'}`
              console.warn('[ganshale]', msg)
              setToast(msg)
              window.setTimeout(() => setToast(null), 6000)
              return
            }
            setToast(`已写入 Obsidian：${res.filePath ?? '日报'}`)
            window.setTimeout(() => setToast(null), 4000)
          })
        }
        if (normalized !== body && assistantId) {
          setMessages((prev) => {
            const out = [...prev]
            const idx = out.findIndex((m) => m.id === assistantId)
            if (idx >= 0) out[idx] = { ...out[idx], content: normalized }
            return out
          })
        }
      }
    }
    return completed && !aborted && Boolean(acc.trim())
  },
    [day],
  )

  const onGenerate = useCallback(async () => {
    if (streamingRef.current) return false
    streamingRef.current = true
    setStreaming(true)
    setReportModalOpen(true)

    try {
    assertLlmConfigured()

    const prompt = loadDailyReportGenerationPrompt()
    const workBlock = buildWorkRecordBlock(loadWorkRecords(day))
    const gatewayModel = getConfiguredGatewayModel()

    const userContent = buildDailyReportGenerationUserContent(
      day,
      prompt,
      workBlock,
      gatewayModel,
    )

    const uiModelId = gatewayModelToUiModelId(gatewayModel)
    const userMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: '请结合所选日期的工作记录列表，生成一份完整日报。',
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
    return await runStream(next, { saveToHistory: true })
    } catch (error) {
      streamingRef.current = false
      setStreaming(false)
      setToast(`生成日报失败：${error instanceof Error ? error.message : String(error)}`)
      return false
    }
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

  /** 按设置页「时间」中的配置自动触发生成日报 */
  useEffect(() => {
    let firedSlots = loadAutoDailyReportFiredSlots(day)
    let disposed = false
    let trying = false
    const tick = async () => {
      if (disposed || trying || streamingRef.current) return
      const now = new Date()
      const { fire, nextSlots } = shouldFireAutoDailyReport(day, now, firedSlots)
      if (!fire) return
      const slot = nextSlots[nextSlots.length - 1]
      if (!slot || !claimAutoDailyReportAttempt(slot)) return
      trying = true
      try {
        if (await onGenerate()) {
          firedSlots = nextSlots
          saveAutoDailyReportFiredSlots(day, firedSlots)
        }
      } finally {
        trying = false
      }
    }
    const wake = () => { void tick() }
    const id = window.setInterval(wake, 30_000)
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    wake()
    return () => { disposed = true; window.clearInterval(id); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake) }
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
      closeReportModal,
      historyModalOpen,
      openHistoryModal,
      closeHistoryModal,
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
      closeReportModal,
      historyModalOpen,
      openHistoryModal,
      closeHistoryModal,
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
      <DailyReportHistoryModal
        open={historyModalOpen}
        day={day}
        onClose={closeHistoryModal}
        onCopyToast={setToast}
      />
    </DailyReportContext.Provider>
  )
}
