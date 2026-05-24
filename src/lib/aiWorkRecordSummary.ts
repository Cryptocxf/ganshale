import { loadAiAutoSummaryPrompt } from './llmUserConfig'
import { resolveAiAutoSummaryPrompt } from './aiAutoSummaryPrompt'
import { expandLlmNetworkError } from './dailyReportChat'
import { assertLlmConfigured, getLlmInvokeConfig } from './llmConfig'
import { chatCompletion } from './llmOpenAI'
import type { AwEvent } from './awTypes'
import { formatWindowEventsForAiSummary } from './aiSummarySchedule'
import type { SystemRecordPeriodId } from './workRecordSettings'

/** 调用模型配置中的大模型，根据窗口记录生成一句工作总结 */
export async function summarizeWindowEventsWithLlm(
  events: AwEvent[],
  periodId: SystemRecordPeriodId,
  signal?: AbortSignal,
): Promise<string> {
  const systemPrompt = resolveAiAutoSummaryPrompt(loadAiAutoSummaryPrompt(), periodId)
  const windowBlock = formatWindowEventsForAiSummary(events)

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
      messages: [
        {
          role: 'system',
          content: '你是工作记录助手。严格按用户提示词要求输出，通常只需一句话，不要加多余解释或标题。',
        },
        { role: 'user', content: userContent },
      ],
      maxTokens: 256,
      signal,
    })
    return raw.replace(/\s+/g, ' ').trim().slice(0, 120)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(expandLlmNetworkError(msg))
  }
}
