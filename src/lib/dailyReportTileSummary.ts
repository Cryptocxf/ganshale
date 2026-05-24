import {
  loadDailyReportHistory,
  sortDailyReportHistoryByTimeAsc,
} from './dailyReportHistoryStore'
import {
  clearDailyReportTileSummary,
  loadDailyReportTileSummary,
  saveDailyReportTileSummary,
} from './dailyReportTileSummaryStore'
import { expandLlmNetworkError } from './dailyReportChat'
import { assertLlmConfigured, getLlmInvokeConfig } from './llmConfig'
import { chatCompletion } from './llmOpenAI'
import { parseYmdLocal, toYmdLocal } from './timeutil'

const inflight = new Map<string, Promise<string | null>>()

function latestReportText(day: Date): { id: string; text: string } | null {
  const sorted = sortDailyReportHistoryByTimeAsc(loadDailyReportHistory(day))
  const last = sorted[sorted.length - 1]
  if (!last?.text.trim()) return null
  return { id: last.id, text: last.text.trim() }
}

async function summarizeReportToOneLine(reportText: string): Promise<string> {
  assertLlmConfigured()
  const { baseUrl, apiKey, model } = getLlmInvokeConfig()
  const raw = await chatCompletion({
    baseUrl,
    apiKey,
    model,
    messages: [
      {
        role: 'system',
        content:
          '你是日报摘要助手。只输出一句简体中文摘要，不超过 48 字。禁止引号、列表、标题、markdown 与多余说明。',
      },
      {
        role: 'user',
        content: [
          '请将以下「当日最后一条日报」浓缩为一句话摘要：',
          '',
          reportText.slice(0, 12_000),
        ].join('\n'),
      },
    ],
    maxTokens: 128,
  })
  const line = raw.replace(/\s+/g, ' ').trim().slice(0, 56)
  if (!line) throw new Error('模型未返回摘要')
  return line
}

async function generateForDay(day: Date, force: boolean): Promise<string | null> {
  if (!force) {
    const cached = loadDailyReportTileSummary(day)
    if (cached?.summary) return cached.summary
  }

  const latest = latestReportText(day)
  if (!latest) {
    clearDailyReportTileSummary(day)
    return null
  }

  const cached = loadDailyReportTileSummary(day)
  if (
    !force &&
    cached?.summary &&
    cached.sourceEntryId === latest.id
  ) {
    return cached.summary
  }

  try {
    const summary = await summarizeReportToOneLine(latest.text)
    saveDailyReportTileSummary(day, {
      summary,
      generatedAt: new Date().toISOString(),
      sourceEntryId: latest.id,
    })
    return summary
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(expandLlmNetworkError(msg))
  }
}

/** 生成并缓存某日方块摘要（默认不重复请求同一来源） */
export async function ensureDailyReportTileSummary(
  day: Date,
  options?: { force?: boolean },
): Promise<string | null> {
  const ymd = toYmdLocal(day)
  const force = options?.force === true
  if (!force) {
    const cached = loadDailyReportTileSummary(day)
    if (cached?.summary) return cached.summary
  }

  const existing = inflight.get(ymd)
  if (existing) return existing

  const task = generateForDay(day, force).finally(() => {
    inflight.delete(ymd)
  })
  inflight.set(ymd, task)
  return task
}

/** 本地 0:00 后为「刚结束的那一天」生成摘要 */
export function runDailyReportTileSummaryAtMidnight(prevYmd: string): void {
  void ensureDailyReportTileSummary(parseYmdLocal(prevYmd), { force: true })
}
