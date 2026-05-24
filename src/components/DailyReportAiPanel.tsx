import { Copy, Download, FileText, Loader2, MessageCircle, Square, Trash2, X } from 'lucide-react'
import {
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  GS_FIELD_INPUT_MD_CLASS,
  GS_MODAL_FOOTER_DIVIDER_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { DailyReportModelAvatar, DailyReportUserAvatar } from './chat/DailyReportChatAvatars'
import type { AwEvent } from '../lib/awTypes'
import {
  CONCISE_DAILY_REPORT_PROMPT,
  DAILY_REPORT_MODELS,
  DAILY_REPORT_PROMPT_PRESETS,
  DETAILED_DAILY_REPORT_PROMPT,
  type DailyReportModelId,
  type DailyReportPromptPresetId,
  effectiveDailyReportPrompt,
  loadDailyReportPrefs,
  saveDailyReportPrefs,
} from '../lib/dailyReportPrefs'
import { formatDuration } from '../lib/aggregations'
import {
  gatewayModelToUiModelId,
  getConfiguredGatewayModel,
  getLlmInvokeConfig,
} from '../lib/llmConfig'
import { streamChatCompletion, type ChatMessageInput } from '../lib/llmOpenAI'
import { formatChatMessageStamp, formatClock, parseIso, toYmdLocal } from '../lib/timeutil'

/** 浏览器对网络/CORS 等问题常只报 Failed to fetch，补充可操作的说明 */
function expandLlmNetworkError(msg: string): string {
  if (!/failed to fetch/i.test(msg) && msg !== 'Load failed') return msg
  return (
    `${msg}\n` +
    '提示：请确认本机 OpenAI 兼容网关已启动。开发（npm run dev）且未配置 VITE_LLM_BASE_URL 时，请求会经本站 /__llm 由 Vite 转发到默认 http://127.0.0.1:15678（可用环境变量 VITE_LLM_PROXY_TARGET 修改）。' +
    '若已设置 VITE_LLM_BASE_URL，请确认地址正确且服务端允许浏览器跨域，或避免在 HTTPS 页面上请求 HTTP 接口。'
  )
}

type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  /** 助手回复所用模型（发送时快照）；用户消息可省略 */
  modelId?: DailyReportModelId
  /** 勾选提示词生成日报时：发给模型的完整正文；气泡展示用固定句式 + dailyReportShell */
  apiContent?: string
  /** 为 true 时用户气泡用「请根据【提示词】…」展示，不展示 apiContent */
  dailyReportShell?: boolean
  /** 生成日报时输入框里的补充说明（可为空） */
  dailyReportExtra?: string
}

const DAILY_MODEL_IDS: DailyReportModelId[] = [
  'qwen3.5',
  'minimax-M2.5',
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'doubao-seed-2.0-mini',
]

function parseStoredModelId(v: unknown): DailyReportModelId | undefined {
  return typeof v === 'string' && DAILY_MODEL_IDS.includes(v as DailyReportModelId)
    ? (v as DailyReportModelId)
    : undefined
}

function chatStorageKey(day: Date) {
  return `ganshale-daily-report-chat:${toYmdLocal(day)}`
}

function extraStorageKey(day: Date) {
  return `ganshale-daily-report-extra:${toYmdLocal(day)}`
}

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

function loadChatLines(day: Date): ChatLine[] {
  try {
    const raw = sessionStorage.getItem(chatStorageKey(day))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ChatLine[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (r.role !== 'user' && r.role !== 'assistant') continue
      const id = typeof r.id === 'string' ? r.id : crypto.randomUUID()
      const content = typeof r.content === 'string' ? r.content : ''
      const createdAt =
        typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt))
          ? r.createdAt
          : new Date().toISOString()
      const mid = r.role === 'assistant' ? parseStoredModelId(r.modelId) : undefined
      const apiContent = typeof r.apiContent === 'string' ? r.apiContent : undefined
      const dailyReportShell = r.dailyReportShell === true
      const dailyReportExtra =
        typeof r.dailyReportExtra === 'string' ? r.dailyReportExtra : undefined
      out.push({
        id,
        role: r.role,
        content,
        createdAt,
        ...(mid ? { modelId: mid } : {}),
        ...(apiContent ? { apiContent } : {}),
        ...(dailyReportShell ? { dailyReportShell: true } : {}),
        ...(dailyReportExtra !== undefined ? { dailyReportExtra } : {}),
      })
    }
    return out
  } catch {
    return []
  }
}

function saveChatLines(day: Date, lines: ChatLine[]) {
  try {
    sessionStorage.setItem(chatStorageKey(day), JSON.stringify(lines))
  } catch {
    /* quota */
  }
}

function buildWindowDataBlock(
  events: AwEvent[],
  remarks: Record<string, string>,
  dayLabel: string,
): string {
  const lines: string[] = [`日期：${dayLabel}`, '']
  const sorted = [...events].sort(
    (a, b) => parseIso(a.timestamp) - parseIso(b.timestamp),
  )
  for (const ev of sorted) {
    const startMs = parseIso(ev.timestamp)
    const t0 = new Date(startMs)
    const t1 = new Date(startMs + Math.max(0, ev.duration) * 1000)
    const app = String(ev.data.app ?? '').trim()
    const title = String(ev.data.title ?? '').trim()
    const rm = (remarks[ev.id] ?? '').trim()
    lines.push(
      `- ${app} | ${formatClock(t0)}–${formatClock(t1)} | ${formatDuration(ev.duration)} | ${title || '（无标题）'}${rm ? ` | 备注：${rm}` : ''}`,
    )
  }
  return lines.join('\n')
}

function toApiMessages(snapshot: ChatLine[]): ChatMessageInput[] {
  return snapshot
    .filter((m) => !(m.role === 'assistant' && m.content === ''))
    .map((m) => ({
      role: m.role,
      content: m.role === 'user' && m.apiContent ? m.apiContent : m.content,
    }))
}

export function DailyReportAiPanel({
  day,
  events,
  remarks,
  embedded = false,
  variant = 'default',
}: {
  day: Date
  events: AwEvent[]
  remarks: Record<string, string>
  /** 嵌入日看板右栏：始终展示模型/提示词/输入，对话区在上方 */
  embedded?: boolean
  /** 今日工作总结：仅展示生成结果与生成日报控件 */
  variant?: 'default' | 'summary'
}) {
  const isSummary = variant === 'summary'
  const initial = loadDailyReportPrefs()
  const [promptPresetId, setPromptPresetId] = useState<DailyReportPromptPresetId>(
    initial.promptPresetId,
  )
  const [promptConcise, setPromptConcise] = useState(initial.promptConcise)
  const [promptDetailed, setPromptDetailed] = useState(initial.promptDetailed)
  const [promptEditorOpen, setPromptEditorOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<DailyReportPromptPresetId>('concise')
  const [draftPrompt, setDraftPrompt] = useState(initial.promptConcise)
  const [messages, setMessages] = useState<ChatLine[]>([])
  const [extraNote, setExtraNote] = useState('')
  const [attachDailyContext, setAttachDailyContext] = useState(loadAttachDailyContext)
  const [streaming, setStreaming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  /** false：居中极简；true：上方对话 + 下方控件（有历史消息或已点击提问/生成） */
  const [layoutActive, setLayoutActive] = useState(embedded || isSummary)

  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const p = loadDailyReportPrefs()
    setPromptPresetId(p.promptPresetId)
    setPromptConcise(p.promptConcise)
    setPromptDetailed(p.promptDetailed)
  }, [])

  useEffect(() => {
    try {
      const lines = loadChatLines(day)
      setMessages(lines)
      setExtraNote(sessionStorage.getItem(extraStorageKey(day)) ?? '')
      setLayoutActive(isSummary || embedded || lines.length > 0)
    } catch {
      setMessages([])
      setExtraNote('')
      setLayoutActive(isSummary || embedded)
    }
  }, [day, embedded, isSummary])

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
    if (!streaming) return
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const prefsForPrompt = useMemo(
    () => ({ promptPresetId, promptConcise, promptDetailed }),
    [promptPresetId, promptConcise, promptDetailed],
  )

  const effectivePrompt = useMemo(
    () => effectiveDailyReportPrompt(prefsForPrompt),
    [prefsForPrompt],
  )

  const gatewayModel = useMemo(() => getConfiguredGatewayModel(), [])
  const uiModelId = useMemo(() => gatewayModelToUiModelId(gatewayModel), [gatewayModel])

  const selectedPromptFull = useMemo(
    () => (promptPresetId === 'concise' ? promptConcise : promptDetailed),
    [promptPresetId, promptConcise, promptDetailed],
  )

  const copyMessageContent = useCallback(async (text: string) => {
    const t = text.trim()
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      setToast('已复制')
    } catch {
      setToast('复制失败')
    }
    window.setTimeout(() => setToast(null), 2000)
  }, [])

  const onPresetChange = useCallback((id: DailyReportPromptPresetId) => {
    setPromptPresetId(id)
    saveDailyReportPrefs({ promptPresetId: id })
  }, [])

  const onAttachDailyContextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.checked
    setAttachDailyContext(v)
    saveAttachDailyContext(v)
  }, [])

  const openPromptEditor = useCallback(() => {
    const kind = promptPresetId
    setEditingPreset(kind)
    setDraftPrompt(kind === 'concise' ? promptConcise : promptDetailed)
    setPromptEditorOpen(true)
  }, [promptPresetId, promptConcise, promptDetailed])

  const savePromptAndClose = useCallback(() => {
    const isConcise = editingPreset === 'concise'
    const fallback = isConcise ? CONCISE_DAILY_REPORT_PROMPT : DETAILED_DAILY_REPORT_PROMPT
    const next = draftPrompt.trim() || fallback
    if (isConcise) {
      setPromptConcise(next)
      saveDailyReportPrefs({ promptConcise: next })
    } else {
      setPromptDetailed(next)
      saveDailyReportPrefs({ promptDetailed: next })
    }
    setPromptEditorOpen(false)
  }, [draftPrompt, editingPreset])

  const runStream = useCallback(
    async (snapshotAfterUserAndPlaceholder: ChatLine[]) => {
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
        if (aborted) {
          return
        }
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
    },
    [],
  )

  const onGenerate = useCallback(() => {
    if (streamingRef.current) return
    setLayoutActive(true)
    const dayLabel = toYmdLocal(day)
    const dataBlock = buildWindowDataBlock(events, remarks, dayLabel)
    const parts: string[] = [effectivePrompt, '']
    const extra = extraNote.trim()
    if (extra) {
      parts.push('【补充说明】', extra, '')
    }
    parts.push(
      `【使用模型】网关 model：${gatewayModel}`,
      '',
      '---',
      '【窗口记录】',
      dataBlock,
    )
    const userContent = parts.join('\n')
    const userMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'user',
      content: extra ? `请根据【提示词】，帮我写一份日报。${extra}` : '请根据【提示词】，帮我写一份日报。',
      apiContent: userContent,
      dailyReportShell: true,
      dailyReportExtra: extra || undefined,
      createdAt: new Date().toISOString(),
    }
    const asstMsg: ChatLine = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      modelId: uiModelId,
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    streamingRef.current = true
    setStreaming(true)

    setMessages((prev) => {
      const next = [...prev, userMsg, asstMsg]
      void runStream(next)
      return next
    })
  }, [day, events, remarks, effectivePrompt, extraNote, gatewayModel, uiModelId, runStream])

  /** 提问模式：与「生成日报」共用 `VITE_LLM_BASE_URL` / `VITE_LLM_API_KEY` 及当前所选模型的网关 id。 */
  const onAskOnly = useCallback(() => {
    const text = extraNote.trim()
    if (!text || streamingRef.current) return

    setLayoutActive(true)

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
  }, [extraNote, runStream, uiModelId])

  const onStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const deleteMessage = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.id === id)
        if (idx < 0) return prev
        const row = prev[idx]
        const isLiveTailAssistant =
          streaming && row.role === 'assistant' && idx === prev.length - 1
        if (isLiveTailAssistant) {
          abortRef.current?.abort()
        }
        return prev.filter((x) => x.id !== id)
      })
    },
    [streaming],
  )

  const onExportTxt = useCallback(() => {
    if (messages.length === 0) return
    const body = messages
      .map((m) => {
        const tag = m.role === 'user' ? '用户' : '助手'
        const bodyText = m.role === 'user' && m.apiContent ? m.apiContent : m.content
        return `[${tag}]\n${bodyText}\n`
      })
      .join('\n---\n\n')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ganshale-daily-chat-${toYmdLocal(day)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    setToast('已导出 TXT。')
    window.setTimeout(() => setToast(null), 3000)
  }, [messages, day])

  const selectBase = `${GS_FIELD_INPUT_MD_CLASS} py-1 pl-1.5 pr-6 shadow-sm`
  const selectEqualCls = `${selectBase} w-[10.5rem]`

  const editorTitle =
    editingPreset === 'concise' ? '编辑「简洁日报」提示词' : '编辑「详细日报」提示词'
  const editorPlaceholder =
    editingPreset === 'concise' ? CONCISE_DAILY_REPORT_PROMPT : DETAILED_DAILY_REPORT_PROMPT

  const chatExpanded = embedded || layoutActive

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

  if (isSummary) {
    return (
      <>
        <section
          aria-label="今日工作总结"
          className="gs-card flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2 sm:p-2.5"
        >
          <DashboardSectionTitle icon={FileText}>今日工作总结</DashboardSectionTitle>

          <div
            className={`gs-dashboard-modal__inset min-h-0 flex-1 overflow-y-auto rounded-lg px-2.5 py-2`}
          >
            {reportStreamingEmpty ? (
              <p className="flex items-center gap-1.5 text-[11px] text-ganshale-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                正在生成日报…
              </p>
            ) : latestReportText ? (
              <p className="whitespace-pre-line text-xs leading-relaxed text-ganshale-text">
                {latestReportText}
                {streaming ? (
                  <span
                    className="ml-px inline-block h-[1em] w-px animate-pulse bg-ganshale-text/40 align-baseline"
                    aria-hidden
                  />
                ) : null}
              </p>
            ) : (
              <p className="text-center text-[11px] text-ganshale-subtle">
                选择提示词后点击「生成日报」（模型见设置 → 模型配置）。
              </p>
            )}
            <div ref={chatBottomRef} className="h-px shrink-0" aria-hidden />
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-[11px] text-ganshale-subtle">
                模型：
                <span className="font-mono text-ganshale-muted">{gatewayModel}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-medium text-ganshale-muted">提示词：</span>
                <select
                  id="daily-report-prompt-preset-summary"
                  value={promptPresetId}
                  onChange={(e) => onPresetChange(e.target.value as DailyReportPromptPresetId)}
                  disabled={streaming}
                  className={selectEqualCls}
                  title={selectedPromptFull}
                >
                  {DAILY_REPORT_PROMPT_PRESETS.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      title={p.id === 'concise' ? promptConcise : promptDetailed}
                    >
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {streaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100/90"
                >
                  <Square className="h-3.5 w-3.5" strokeWidth={2} />
                  停止
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void onGenerate()}
                disabled={streaming}
                className="inline-flex min-w-[11rem] items-center justify-center gap-1.5 rounded-lg bg-blue-900 px-8 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <FileText className="h-4 w-4 opacity-90" strokeWidth={1.8} />
                )}
                生成日报
              </button>
            </div>
          </div>
        </section>

        {toast ? (
          <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900">
            {toast}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <>
      <section
        aria-label="日报生成与对话"
        className={
          chatExpanded
            ? 'gs-card flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5 sm:p-3'
            : 'gs-card flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-3 py-3'
        }
      >
        {chatExpanded ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1 rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-100/90"
              >
                <Square className="h-3 w-3" strokeWidth={2} />
                停止
              </button>
            ) : null}
            <button
              type="button"
              onClick={onExportTxt}
              disabled={messages.length === 0 || streaming}
              className={`${DASHBOARD_HEADER_ACTION_BTN_CLASS} inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Download className="h-3 w-3" strokeWidth={2} />
              导出 TXT
            </button>
          </div>
        ) : null}
        {chatExpanded ? (
      <div
        className={`gs-dashboard-modal__inset min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg px-2 py-2`}
      >
        {messages.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-ganshale-subtle">暂无消息。</p>
        ) : (
          messages.map((m, i) => {
            const isLiveAssistantTail =
              m.role === 'assistant' && i === messages.length - 1
            const showAssistantCopy =
              m.role === 'assistant' &&
              !(streaming && isLiveAssistantTail && m.content.trim() === '') &&
              (m.content.trim() !== '' || streaming)

            const stamp = formatChatMessageStamp(m.createdAt)

            if (m.role === 'user') {
              return (
                <div key={m.id} className="flex w-full max-w-full flex-row-reverse items-start gap-2">
                  <DailyReportUserAvatar />
                  <div className="flex min-w-0 max-w-[calc(100%-2.5rem)] flex-col items-end gap-1 self-start">
                    <div className="m-0 max-w-full whitespace-pre-line break-words text-right font-sans text-xs leading-normal text-ganshale-text">
                      {m.dailyReportShell ? (
                        <span className="inline-block text-left">
                          请根据
                          <span className="font-semibold text-ganshale-accent">【提示词】</span>
                          ，帮我写一份日报。
                          {(m.dailyReportExtra ?? '').trim() ? (
                            <span>{(m.dailyReportExtra ?? '').trim()}</span>
                          ) : null}
                        </span>
                      ) : (
                        m.content
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ganshale-subtle">
                      <span>你</span>
                      {stamp ? <span className="tabular-nums">{stamp}</span> : null}
                      <button
                        type="button"
                        onClick={() => deleteMessage(m.id)}
                        className="rounded p-0.5 text-ganshale-muted transition hover:bg-black/[0.06] hover:text-ganshale-text"
                        aria-label="删除本条"
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            const assistantModelId = m.modelId ?? uiModelId
            const assistantLabel =
              DAILY_REPORT_MODELS.find((x) => x.id === assistantModelId)?.label ?? assistantModelId

            return (
              <div key={m.id} className="flex w-full max-w-full flex-row items-start gap-2">
                <DailyReportModelAvatar modelId={assistantModelId} />
                <div className="-mt-2 flex min-w-0 max-w-[calc(100%-2.5rem)] flex-col items-start gap-1 self-start">
                  <div className="m-0 max-w-full whitespace-pre-line break-words font-sans text-xs leading-tight text-ganshale-text">{streaming && isLiveAssistantTail && m.content === '' ? (
                      <span className="flex items-start gap-1.5 text-ganshale-muted">
                        <Loader2 className="mt-px h-3 w-3 shrink-0 animate-spin" strokeWidth={2} />
                        <span className="leading-none">接收中…</span>
                      </span>
                    ) : null}{m.content}{streaming && isLiveAssistantTail && m.content ? (
                      <span
                        className="ml-px inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-ganshale-text/40 align-baseline"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  {showAssistantCopy ? (
                    <button
                      type="button"
                      onClick={() => void copyMessageContent(m.content)}
                      className="-ml-0.5 inline-flex shrink-0 rounded p-1 text-ganshale-muted transition hover:bg-black/[0.04] hover:text-ganshale-text"
                      aria-label="复制本条回复"
                      title="复制"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-ganshale-subtle">
                    {assistantLabel ? <span>{assistantLabel}</span> : null}
                    {stamp ? <span className="tabular-nums">{stamp}</span> : null}
                    <button
                      type="button"
                      onClick={() => deleteMessage(m.id)}
                      className="rounded p-0.5 text-ganshale-muted transition hover:bg-black/[0.06] hover:text-ganshale-text"
                      aria-label="删除本条"
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={chatBottomRef} className="h-px shrink-0" aria-hidden />
      </div>
        ) : null}

      <div
        className={
          !chatExpanded
            ? 'mx-auto inline-grid max-w-full grid-cols-1 justify-items-stretch gap-2 -translate-y-8 md:-translate-y-12'
            : 'mx-auto grid w-full max-w-full shrink-0 grid-cols-1 justify-items-stretch gap-2'
        }
      >
      <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="text-[11px] text-ganshale-subtle">
          模型：<span className="font-mono text-ganshale-muted">{gatewayModel}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="shrink-0 text-[11px] font-medium text-ganshale-muted">提示词：</span>
          <input
            type="checkbox"
            checked={attachDailyContext}
            onChange={onAttachDailyContextChange}
            disabled={streaming}
            aria-label="附带提示词与窗口记录"
            title="附带提示词与窗口记录"
            className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-ganshale-border text-ganshale-accent focus:ring-ganshale-text/20 disabled:cursor-not-allowed"
          />
          <select
            id="daily-report-prompt-preset"
            value={promptPresetId}
            onChange={(e) => onPresetChange(e.target.value as DailyReportPromptPresetId)}
            disabled={streaming}
            className={selectEqualCls}
            title={selectedPromptFull}
          >
            {DAILY_REPORT_PROMPT_PRESETS.map((p) => (
              <option
                key={p.id}
                value={p.id}
                title={p.id === 'concise' ? promptConcise : promptDetailed}
              >
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openPromptEditor}
            disabled={streaming}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-ganshale-accent underline-offset-2 hover:underline disabled:opacity-40"
          >
            编辑
          </button>
        </div>
      </div>

      <div className="flex w-full min-h-[2.75rem] shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        <label htmlFor="daily-report-composer" className="sr-only">
          {attachDailyContext ? '补充说明' : '向模型提问'}
        </label>
        <textarea
          id="daily-report-composer"
          rows={2}
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (!e.ctrlKey && !e.metaKey) return
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (streaming) return
            if (attachDailyContext) {
              void onGenerate()
            } else if (extraNote.trim()) {
              void onAskOnly()
            }
          }}
          disabled={streaming}
          placeholder={
            attachDailyContext
              ? '可选：补充说明、当日重点、希望强调的内容…（可不填，仍会生成日报）'
              : '输入要向模型说的话…（提问模式下为必填）'
          }
          className={`min-h-[2.75rem] w-full min-w-0 shrink resize-y rounded-lg px-3 py-2 text-xs leading-relaxed ${GS_FIELD_INPUT_MD_CLASS} disabled:opacity-50 sm:flex-1`}
        />
        <button
          type="button"
          onClick={() => (attachDailyContext ? onGenerate() : void onAskOnly())}
          disabled={streaming || (!attachDailyContext && !extraNote.trim())}
          className="inline-flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[7.5rem]"
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : attachDailyContext ? (
              <FileText className="h-4 w-4 opacity-90" strokeWidth={1.8} />
            ) : (
              <MessageCircle className="h-4 w-4 opacity-90" strokeWidth={1.8} />
            )}
            {attachDailyContext ? '生成日报' : '提问'}
          </span>
          {!attachDailyContext && !streaming ? (
            <span className="text-[9px] font-normal font-sans leading-none text-white/70">
              Ctrl+Enter 发送
            </span>
          ) : null}
        </button>
      </div>
      </div>
      </section>

      {toast ? (
        <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900">
          {toast}
        </p>
      ) : null}

      {promptEditorOpen ? (
        <DashboardModalRoot
          open
          onClose={() => setPromptEditorOpen(false)}
          zIndex={100}
          labelledBy="daily-prompt-editor-title"
          overlayClassName="items-end justify-end p-2 sm:p-3"
          dialogClassName="max-h-[46vh] w-full max-w-sm"
        >
            <div
              className={`flex items-center justify-between px-2.5 py-2 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
            >
              <h3
                id="daily-prompt-editor-title"
                className="font-display text-xs font-semibold text-ganshale-text"
              >
                {editorTitle}
              </h3>
              <button
                type="button"
                onClick={() => setPromptEditorOpen(false)}
                className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
                aria-label="关闭"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-2.5 py-2 sm:px-3">
              <textarea
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                rows={9}
                className={`w-full resize-y rounded-lg p-2 font-mono text-[11px] leading-relaxed ${GS_FIELD_INPUT_MD_CLASS}`}
                placeholder={editorPlaceholder}
              />
            </div>
            <div
              className={`flex flex-wrap justify-end gap-1.5 px-2.5 py-2 sm:px-3 ${GS_MODAL_FOOTER_DIVIDER_CLASS}`}
            >
              <button
                type="button"
                onClick={() => setPromptEditorOpen(false)}
                className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
              >
                取消
              </button>
              <button
                type="button"
                onClick={savePromptAndClose}
                className="gs-toolbar-btn gs-toolbar-btn--accent px-3 py-1.5 text-xs"
              >
                保存
              </button>
            </div>
        </DashboardModalRoot>
      ) : null}
    </>
  )
}
