import { formatDatetimeZh, formatReportDayLabelZh, toYmdLocal } from './timeutil'

/** 发给模型的日报生成上下文（含报告日期约束） */
export function buildDailyReportGenerationUserContent(
  day: Date,
  prompt: string,
  workBlock: string,
  gatewayModel: string,
): string {
  const reportYmd = toYmdLocal(day)
  const reportDayLabel = formatReportDayLabelZh(day)
  const generatedAt = formatDatetimeZh(new Date())

  return [
    '【提示词】',
    prompt,
    '',
    '---',
    `【报告日期】${reportYmd}（${reportDayLabel}）`,
    `【生成时刻】${generatedAt}`,
    `【日期约束】报告 Markdown 一级标题必须且仅能写作：\`# 日报 ${reportYmd}\`。禁止编造、猜测或使用 2024 等示例日期；工作记录括号内时刻仅为当日时段，不是报告日期。`,
    '',
    '【今日工作记录】',
    workBlock,
    '',
    `【使用模型】网关 model：${gatewayModel}`,
  ].join('\n')
}

/** 将模型输出的一级标题日期校正为指定日历日 */
export function normalizeDailyReportTitleDate(text: string, day: Date): string {
  const ymd = toYmdLocal(day)
  const title = `# 日报 ${ymd}`
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  if (/^#\s*日报\s/m.test(trimmed)) {
    return trimmed.replace(/^#\s*日报\s+.+$/m, title)
  }
  return `${title}\n\n${trimmed}`
}
