import { llmUpstreamHeaders, resolveLlmFetchBaseUrl } from './llmFetchBaseUrl'

export type ChatRole = 'system' | 'user' | 'assistant'

function llmChatCompletionsUrl(configuredBaseUrl: string): string {
  return `${resolveLlmFetchBaseUrl(configuredBaseUrl).replace(/\/+$/, '')}/chat/completions`
}

function llmRequestHeaders(configuredBaseUrl: string, apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...llmUpstreamHeaders(configuredBaseUrl),
  }
}

export type ChatMessageInput = {
  role: ChatRole
  content: string
}

/**
 * OpenAI 兼容：`POST {baseUrl}/chat/completions`，`stream: true` 时解析 SSE。
 */
export async function streamChatCompletion(options: {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessageInput[]
  signal?: AbortSignal
  onDelta: (text: string) => void
}): Promise<void> {
  const url = llmChatCompletionsUrl(options.baseUrl)
  const res = await fetch(url, {
    method: 'POST',
    headers: llmRequestHeaders(options.baseUrl, options.apiKey),
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(
      errText ? `HTTP ${res.status}: ${errText.slice(0, 500)}` : `HTTP ${res.status}`,
    )
  }

  const body = res.body
  if (!body) throw new Error('响应无正文')

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const flushEventBlock = (block: string) => {
    const lines = block.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return true
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>
          error?: { message?: string }
        }
        if (json.error?.message) {
          throw new Error(json.error.message)
        }
        const choice = json.choices?.[0]
        const piece =
          choice?.delta?.content ??
          (typeof choice?.message?.content === 'string' ? choice.message.content : '')
        if (piece) options.onDelta(piece)
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
    return false
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        if (flushEventBlock(part)) return
      }
    }
    if (buffer.trim()) {
      if (flushEventBlock(buffer)) return
    }
  } finally {
    reader.releaseLock()
  }
}

/** 非流式对话：用于 AI 自动总结等工作记录生成 */
export async function chatCompletion(options: {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessageInput[]
  maxTokens?: number
  signal?: AbortSignal
}): Promise<string> {
  const url = llmChatCompletionsUrl(options.baseUrl)
  const res = await fetch(url, {
    method: 'POST',
    headers: llmRequestHeaders(options.baseUrl, options.apiKey),
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: false,
      max_tokens: options.maxTokens ?? 1024,
    }),
    signal: options.signal,
  })

  const raw = await res.text().catch(() => '')
  if (!res.ok) {
    let detail = raw.slice(0, 800)
    try {
      const j = JSON.parse(raw) as { error?: { message?: string }; message?: string }
      detail = j.error?.message ?? j.message ?? detail
    } catch {
      /* keep raw */
    }
    throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`)
  }

  try {
    const j = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>
      error?: { message?: string }
    }
    if (j.error?.message) throw new Error(j.error.message)
    const text = j.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('模型未返回有效正文')
    return text
  } catch (e) {
    if (e instanceof Error && e.message !== '模型未返回有效正文') throw e
    throw new Error(raw.slice(0, 300) || '无法解析网关响应')
  }
}

/** 非流式探测：用于设置页「测试」连接 */
export async function testChatCompletion(options: {
  baseUrl: string
  apiKey: string
  model: string
  signal?: AbortSignal
}): Promise<string> {
  return chatCompletion({
    ...options,
    messages: [{ role: 'user', content: '请只回复一个词：OK' }],
    maxTokens: 64,
  })
}
