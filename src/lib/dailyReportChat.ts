import type { AwEvent } from './awTypes'
import type { DailyReportModelId } from './dailyReportPrefs'
import { formatDuration } from './aggregations'
import { formatClock, parseIso, toYmdLocal } from './timeutil'
import type { ChatMessageInput } from './llmOpenAI'

export type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  modelId?: DailyReportModelId
  apiContent?: string
  dailyReportShell?: boolean
  dailyReportExtra?: string
}

const DAILY_MODEL_IDS: DailyReportModelId[] = [
  'qwen3.5',
  'minimax-M2.5',
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'doubao-seed-2.0-mini',
]

export function parseStoredModelId(v: unknown): DailyReportModelId | undefined {
  return typeof v === 'string' && DAILY_MODEL_IDS.includes(v as DailyReportModelId)
    ? (v as DailyReportModelId)
    : undefined
}

export function chatStorageKey(day: Date) {
  return `ganshale-daily-report-chat:${toYmdLocal(day)}`
}

export function extraStorageKey(day: Date) {
  return `ganshale-daily-report-extra:${toYmdLocal(day)}`
}

export function loadChatLines(day: Date): ChatLine[] {
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

export function saveChatLines(day: Date, lines: ChatLine[]) {
  try {
    sessionStorage.setItem(chatStorageKey(day), JSON.stringify(lines))
  } catch {
    /* quota */
  }
}

export function buildWindowDataBlock(
  events: AwEvent[],
  remarks: Record<string, string>,
  dayLabel: string,
): string {
  const lines: string[] = [`日期：${dayLabel}`, '']
  const sorted = [...events].sort((a, b) => parseIso(a.timestamp) - parseIso(b.timestamp))
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

export function toApiMessages(snapshot: ChatLine[]): ChatMessageInput[] {
  return snapshot
    .filter((m) => !(m.role === 'assistant' && m.content === ''))
    .map((m) => ({
      role: m.role,
      content: m.role === 'user' && m.apiContent ? m.apiContent : m.content,
    }))
}

export function expandLlmNetworkError(msg: string): string {
  if (!/failed to fetch/i.test(msg) && msg !== 'Load failed') return msg
  return (
    `${msg}\n` +
    '提示：请确认本机 OpenAI 兼容网关已启动。开发（npm run dev）且未配置 VITE_LLM_BASE_URL 时，请求会经本站 /__llm 由 Vite 转发到默认 http://127.0.0.1:15678（可用环境变量 VITE_LLM_PROXY_TARGET 修改）。' +
    '若已设置 VITE_LLM_BASE_URL，请确认地址正确且服务端允许浏览器跨域，或避免在 HTTPS 页面上请求 HTTP 接口。'
  )
}
