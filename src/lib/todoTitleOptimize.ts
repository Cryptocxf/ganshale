import { assertLlmConfigured, getLlmInvokeConfig } from './llmConfig'
import { expandLlmNetworkError } from './dailyReportChat'
import { chatCompletion } from './llmOpenAI'
import { batchUpdateTodoTitles, loadTodos } from './todoStore'

const CHUNK_SIZE = 25

function extractJsonArray(raw: string): unknown {
  let text = raw.trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) text = fenced[1].trim()
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1)
  }
  return JSON.parse(text)
}

function parseOptimizeChunk(
  raw: string,
  expectedIds: readonly string[],
): Record<string, string> {
  const parsed = extractJsonArray(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('模型返回格式不正确（应为 JSON 数组）')
  }

  const expected = new Set(expectedIds)
  const updates: Record<string, string> = {}

  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id : ''
    const title =
      typeof r.title === 'string'
        ? r.title.trim()
        : typeof r.optimizedTitle === 'string'
          ? r.optimizedTitle.trim()
          : ''
    if (!id || !title || !expected.has(id)) continue
    updates[id] = title.replace(/\s+/g, ' ').trim()
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('模型未返回可用的优化结果')
  }

  return updates
}

/** 使用设置中的大模型，批量优化待办标题（每条一句话） */
export async function optimizeAllTodoTitles(
  signal?: AbortSignal,
): Promise<{ updated: number; total: number }> {
  assertLlmConfigured()
  const items = loadTodos()
  if (items.length === 0) return { updated: 0, total: 0 }

  const { baseUrl, apiKey, model } = getLlmInvokeConfig()
  const allUpdates: Record<string, string> = {}

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    const payload = chunk.map((t) => ({ id: t.id, title: t.title }))

    try {
      const raw = await chatCompletion({
        baseUrl,
        apiKey,
        model,
        signal,
        maxTokens: Math.min(4096, 120 + chunk.length * 80),
        messages: [
          {
            role: 'system',
            content:
              '你是待办文案优化助手。将每条待办改写成语法正确、逻辑清晰的一句话，保持原意，不要编号、不要解释、不要 markdown。只输出 JSON 数组，元素形如 {"id":"...","title":"..."}，id 必须与输入一致。',
          },
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
      })
      Object.assign(allUpdates, parseOptimizeChunk(raw, chunk.map((c) => c.id)))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(expandLlmNetworkError(msg))
    }
  }

  const updated = batchUpdateTodoTitles(allUpdates)
  return { updated, total: items.length }
}
