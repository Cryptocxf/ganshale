import type { SystemRecordPeriodId } from './workRecordSettings'

/** 写入配置；展示与调用 LLM 时替换为当前「自动总结间隔」对应文案 */
export const AI_AUTO_SUMMARY_WINDOW_PLACEHOLDER = '{{SUMMARY_WINDOW}}'

const LEGACY_AI_AUTO_SUMMARY_PROMPTS = new Set([
  '根据我的应用时长和内容，总结一段工作内容记录',
])

/** 根据自动总结间隔生成「过去10分钟」等时间描述 */
export function summaryWindowPhrase(periodId: SystemRecordPeriodId): string {
  switch (periodId) {
    case '10m':
      return '过去10分钟'
    case '30m':
      return '过去30分钟'
    case '1h':
      return '过去1小时'
    case '2h':
      return '过去2小时'
    case '5h':
      return '过去5小时'
    case '12:00':
      return '今日截至12:00'
    case '18:00':
      return '今日截至18:00'
    default:
      return '过去30分钟'
  }
}

export function buildDefaultAiAutoSummaryPromptTemplate(): string {
  const w = AI_AUTO_SUMMARY_WINDOW_PLACEHOLDER
  return [
    '## 角色',
    '你是一位细心的个人工作助理。',
    '',
    '## 任务',
    `根据${w}内采集到的【应用窗口记录】，用一句简短的话总结用户可能在做的工作。`,
    '',
    '## 输入数据格式',
    '每条记录包含：应用名、窗口标题、开始时间、结束时间、时长（秒）。',
    '',
    '## 总结规则',
    '1. 只总结**时长超过10秒**的窗口切换（过滤掉瞬间切换）。',
    '2. 如果多个记录属于同一个应用/任务，合并为一条总结。',
    '3. 推测具体动作，例如：',
    '   - "Cursor + SKILL.md" → "正在编写技术文档 SKILL.md"',
    '   - "Chrome + GitHub pull requests" → "审查GitHub上的PR"',
    '   - "企业微信 + 与张三的聊天" → "与同事沟通工作"',
    '   - "Weixin" → "使用微信沟通"（模糊时这样写）',
    '4. 不要编造不存在的内容，不确定时用“可能”或“正在使用[应用名]”。',
    '5. 输出格式：仅输出一句话，不超过30字，不加标点符号以外的修饰。',
    '',
    '## 待总结的窗口记录',
    `[这里粘贴${w}采集到的原始记录]。`,
  ].join('\n')
}

export function usesAiAutoSummaryWindowPlaceholder(text: string): boolean {
  return text.includes(AI_AUTO_SUMMARY_WINDOW_PLACEHOLDER)
}

export function isLegacyAiAutoSummaryPrompt(text: string): boolean {
  const t = text.trim()
  return !t || LEGACY_AI_AUTO_SUMMARY_PROMPTS.has(t)
}

/** 将旧版短提示词或未配置项规范为带占位符的默认模板 */
export function normalizeStoredAiAutoSummaryPrompt(stored: string): string {
  const t = stored.trim()
  if (isLegacyAiAutoSummaryPrompt(t)) return buildDefaultAiAutoSummaryPromptTemplate()
  return t
}

export function resolveAiAutoSummaryPrompt(
  stored: string,
  periodId: SystemRecordPeriodId,
): string {
  const normalized = normalizeStoredAiAutoSummaryPrompt(stored)
  if (!usesAiAutoSummaryWindowPlaceholder(normalized)) return normalized
  const phrase = summaryWindowPhrase(periodId)
  return normalized.split(AI_AUTO_SUMMARY_WINDOW_PLACEHOLDER).join(phrase)
}
