import { loadAiAutoSummaryPrompt } from './llmUserConfig'
import { resolveAiAutoSummaryPrompt } from './aiAutoSummaryPrompt'
import { expandLlmNetworkError } from './dailyReportChat'
import { assertLlmConfigured, getLlmInvokeConfig } from './llmConfig'
import { chatCompletion } from './llmOpenAI'
import type { AwEvent } from './awTypes'
import type { SystemRecordPeriodId } from './workRecordSettings'

/** 调用模型配置中的大模型，根据窗口记录生成一句工作总结 */
export async function summarizeWindowEventsWithLlm(
  events: AwEvent[],
  periodId: SystemRecordPeriodId,
  signal?: AbortSignal,
): Promise<string> {
  const systemPrompt = resolveAiAutoSummaryPrompt(loadAiAutoSummaryPrompt(), periodId)
  const grouped = new Map<string, AwEvent>()
  for (const event of events) {
    const key = JSON.stringify([event.data.app, event.data.title])
    const previous = grouped.get(key)
    grouped.set(key, previous ? { ...previous, duration: previous.duration + event.duration } : event)
  }
  const windowBlock = [...grouped.values()].map((event, index) =>
    `${index + 1}. ${String(event.data.app ?? '')} | ${String(event.data.title ?? '')} | 累计${Math.round(event.duration)}秒`,
  ).join('\n')

  const userContent = [
    systemPrompt,
    '',
    '---',
    '以下为待总结的窗口记录：',
    windowBlock,
  ].join('\n')

  assertLlmConfigured()
  const { baseUrl, apiKey, model } = getLlmInvokeConfig()

  try {
    const raw = await chatCompletion({
      baseUrl,
      apiKey,
      model,
      ...(model.toLowerCase().startsWith('qwen') ? { enableThinking: false } : {}),
      messages: [
        {
          role: 'system',
          content: '你是工作记录助手。严格按用户提示词要求输出，通常只需一句话，不要加多余解释或标题。',
        },
        { role: 'user', content: userContent },
      ],
      // 推理模型会同时消耗 reasoning token；留足余量，避免正文尚未生成就结束。
      maxTokens: 1024,
      signal,
    })
    return raw.replace(/\s+/g, ' ').trim()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(expandLlmNetworkError(msg))
  }
}
