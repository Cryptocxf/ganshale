import type { DailyReportModelId } from './dailyReportPrefs'
import {
  CONCISE_DAILY_REPORT_PROMPT,
  DETAILED_DAILY_REPORT_PROMPT,
  DAILY_REPORT_MODELS,
} from './dailyReportPrefs'
import {
  buildDefaultAiAutoSummaryPromptTemplate,
  normalizeStoredAiAutoSummaryPrompt,
  resolveAiAutoSummaryPrompt,
} from './aiAutoSummaryPrompt'
import { loadWorkRecordSettings } from './workRecordSettings'
const STORAGE_KEY = 'ganshale-llm-config-v2'
const STORAGE_KEY_V1 = 'ganshale-llm-config-v1'
const WORK_RECORD_SETTINGS_KEY = 'ganshale-work-record-settings-v2'

const MODEL_IDS = new Set<string>(DAILY_REPORT_MODELS.map((m) => m.id))

export const DEFAULT_LLM_BASE_URL =
  'https://ai.soho.komect.com/ai/llm/demo/llm-proxy/v1'

export const DEFAULT_LLM_API_KEY = '3886B9B1-FABA-4694-85CB-11FC271D1F29'

export const DEFAULT_GATEWAY_MODEL_ID = 'qwen3-max'

const LEGACY_DEFAULT_GATEWAY_MODEL_ID = 'qwen3.5-hy'
const LEGACY_DEFAULT_API_KEY = 'lingxiclaw-session-312374384'
const LEGACY_DEFAULT_BASE_URLS = new Set(['http://127.0.0.1:15678/v1'])

function resolveStoredBaseUrl(stored: string | undefined, fallback: string): string {
  const t = stored?.trim() ?? ''
  if (!t || LEGACY_DEFAULT_BASE_URLS.has(t)) return fallback
  return t
}

function resolveStoredApiKey(stored: string | undefined, fallback: string): string {
  const t = stored?.trim() ?? ''
  if (!t || t === LEGACY_DEFAULT_API_KEY || t === DEFAULT_LLM_API_KEY) return fallback
  return t
}

/** 是否使用内置默认 Key（未自定义） */
export function isBuiltinLlmApiKey(key: string): boolean {
  const t = key.trim()
  return !t || t === DEFAULT_LLM_API_KEY
}

/** 持久化用：内置默认 URL / Key 存为空字符串 */
export function normalizeLlmConfigForStorage(
  config: Pick<LlmUserConfig, 'baseUrl' | 'apiKey' | 'gatewayModelId'>,
  defaultBaseUrl: string = describeDefaultLlmBaseUrl(),
): Pick<LlmUserConfig, 'baseUrl' | 'apiKey' | 'gatewayModelId'> {
  const baseUrl = config.baseUrl.trim()
  const apiKey = config.apiKey.trim()
  return {
    baseUrl:
      !baseUrl || baseUrl === defaultBaseUrl || baseUrl === DEFAULT_LLM_BASE_URL ? '' : baseUrl,
    apiKey: isBuiltinLlmApiKey(apiKey) ? '' : apiKey,
    gatewayModelId: resolveStoredGatewayModelId(config.gatewayModelId),
  }
}

function resolveStoredGatewayModelId(stored: string | undefined): string {
  const t = stored?.trim() ?? ''
  if (!t || t === LEGACY_DEFAULT_GATEWAY_MODEL_ID) return DEFAULT_GATEWAY_MODEL_ID
  return t
}

export const DEFAULT_DAILY_REPORT_GENERATION_PROMPT = [
  '## 角色',
  '你是一位专业的职场助理，擅长整理零散的工作记录，生成结构清晰、重点突出的日报。',
  '',
  '## 任务',
  '根据【今日工作记录列表】，生成一份结构化的日报。',
  '',
  '## 输入数据',
  '每条工作记录包含：内容描述、时间（可选）、分类（如有）。',
  '',
  '## 输出格式要求',
  '严格按以下Markdown结构输出：',
  '',
  '# 日报 YYYY-MM-DD',
  '',
  '## 一、工作概览',
  '- 总记录条数：X条',
  '- 主要分类：开发、会议、沟通、文档、其他',
  '',
  '## 二、按分类总结',
  '',
  '### 开发',
  '- [具体任务1]',
  '- [具体任务2]',
  '',
  '### 会议',
  '- [具体会议/沟通内容]',
  '',
  '### 文档',
  '- [具体文档编写内容]',
  '',
  '### 其他',
  '- [其他事项]',
  '',
  '## 三、重点产出',
  '（从以上内容中提炼1-3条最重要的成果，用✅标记）',
  '',
  '## 四、待办/备注',
  '（根据未完成事项或上下文，推测明日可能的待办，如果没有则写“无”）',
  '',
  '## 处理规则',
  '1. 合并同类项：例如“写login函数”和“调试login模块”合并为“完成登录模块开发与调试”。',
  '2. 推测分类：根据关键词自动归类（如“Cursor/代码/调试”→开发，“会议/讨论/评审”→会议，“微信/钉钉”→沟通）。',
  '3. 忽略明显非工作记录（如时长<1分钟的零星切换、个人娱乐内容）。',
  '4. 如果某条记录过于模糊（如只有“Cursor”），保留原样但不强行归类到“开发”。',
  '',
  '## 今日工作记录列表',
  '[这里粘贴“今日工作记录”表格的全部内容，格式如：序号、具体内容、时间、分类（如有）]',
].join('\n')

export const DEFAULT_WEEKLY_REPORT_GENERATION_PROMPT = [
  '## 角色',
  '你是一位专业的职场助理，擅长将零散的工作记录整理成结构清晰、语言精炼的周报。',
  '',
  '## 任务',
  '根据我提供的【本周每日工作记录汇总】，生成一份符合我风格的周报。',
  '',
  '## 输出格式要求',
  '严格按照以下格式输出，不要添加额外解释：',
  '',
  '【分类标题1】',
  '1. 具体工作内容描述（不超过20字）',
  '2. 具体工作内容描述',
  '3. ...',
  '',
  '【分类标题2】',
  '1. 具体工作内容描述',
  '2. 具体工作内容描述',
  '3. ...',
  '',
  '【分类标题3】',
  '1. 具体工作内容描述',
  '2. ...',
  '',
  '（以此类推）',
  '',
  '## 内容处理规则',
  '1. **分类方式**：根据工作内容的性质自动归类，分类标题用【】包裹。常见分类示例：产品需求、开发任务、测试提测、文档编写、会议沟通、出差支持、问题修复等。',
  '2. **精炼原则**：每条工作描述不超过20个字，去掉冗余修饰，动词开头或直接陈述结果。',
  '   - ✅ 好例子：“完成登录页面协议条款添加”',
  '   - ❌ 坏例子：“完成了登录页面上关于协议条款的添加工作，增加了三个协议链接”',
  '3. **合并同类项**：相同类型、相近主题的工作合并为一条。例如“修改openclaw配置”和“更新openclaw下载逻辑”合并为“完成openclaw配置优化与下载功能”',
  '4. **优先级排序**：每条分类下，按重要性或时间顺序排列，重要的放前面。',
  '5. **过滤噪音**：忽略时长过短（<5分钟）、明显非工作、个人娱乐性质的记录。',
  '',
  '## 参考示例（你的风格）',
  '【灵犀AI网关】',
  '1. 修改openclaw和hermes两个agent的模型配置页面',
  '2. 配置区域新增模型展示及base_url统一配置逻辑',
  '3. 完成云电脑/非云电脑环境自测及V1.0.0提测',
  '',
  '【大模型服务】',
  '1. 泛屏、客服、运支、算安模型开通',
  '',
  '【openclaw】',
  '1. 开发家庭场景龙虾联动skill，实现指挥-执行任务链',
  '',
  '【其他】',
  '1. 苏州出差、布展，支撑演示保障需求',
  '2. 支撑xxppt材料编写',
  '',
  '## 本周每日工作记录汇总',
  '[在这里粘贴你从周一到周日的所有“今日工作记录”内容]',
].join('\n')

const LEGACY_WEEKLY_REPORT_GENERATION_PROMPT = [
  '## 角色',
  '你是一位专业的行政助理，擅长从一周的工作记录中归纳重点，生成结构清晰的周报。',
  '',
  '## 任务',
  '请根据我提供的【本周工作记录】，生成一份**工作周报**。',
  '',
  '## 要求',
  '1. 按「本周概览」「主要成果」「问题与风险」「下周计划」四部分组织。',
  '2. 合并重复事项，突出成果与数据；忽略琐碎、非工作相关内容。',
  '3. 语言简洁，适合直接提交或稍作修改后提交。',
].join('\n')

const LEGACY_DAILY_REPORT_PROMPTS = new Set([
  CONCISE_DAILY_REPORT_PROMPT,
  DETAILED_DAILY_REPORT_PROMPT,
  '根据我的应用时长和内容，总结一段工作内容记录',
  '结合我的今日工作，给出一段话总结。',
])

/** 当前版本内置的结构化日报模板（用户自定义时通常仍保留这些锚点） */
function isStructuredDailyReportTemplate(text: string): boolean {
  const t = text.trim()
  return (
    t.includes('## 一、工作概览') &&
    t.includes('职场助理') &&
    t.includes('今日工作记录列表')
  )
}

function isLegacyDailyReportPrompt(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (isStructuredDailyReportTemplate(t)) return false
  if (LEGACY_DAILY_REPORT_PROMPTS.has(t)) return true
  if (t.includes('结合我的今日工作') || t.includes('一段话总结')) return true
  if (t.includes('【今日时间线数据】') || t.includes('简洁日报')) return true
  if (t.includes('行政助理') && t.includes('极简风格')) return true
  return true
}

function isLegacyWeeklyReportPrompt(text: string): boolean {
  const t = text.trim()
  if (t === LEGACY_WEEKLY_REPORT_GENERATION_PROMPT) return true
  if (t.includes('【分类标题1】') || t.includes('本周每日工作记录汇总')) return false
  if (t.includes('本周概览') && t.includes('主要成果')) return true
  return false
}

export function normalizeStoredDailyReportPrompt(stored: string): string {
  const t = stored.trim()
  if (!t || isLegacyDailyReportPrompt(t)) return DEFAULT_DAILY_REPORT_GENERATION_PROMPT
  return t
}

export function normalizeStoredWeeklyReportPrompt(stored: string): string {
  const t = stored.trim()
  if (!t || isLegacyWeeklyReportPrompt(t)) return DEFAULT_WEEKLY_REPORT_GENERATION_PROMPT
  return t
}

export type LlmUserConfig = {
  baseUrl: string
  apiKey: string
  gatewayModelId: string
  modelMap: Partial<Record<DailyReportModelId, string>>
  aiAutoSummaryPrompt: string
  dailyReportPrompt: string
  weeklyReportPrompt: string
}

export function defaultLlmUserConfig(): LlmUserConfig {
  return {
    baseUrl: DEFAULT_LLM_BASE_URL,
    apiKey: DEFAULT_LLM_API_KEY,
    gatewayModelId: DEFAULT_GATEWAY_MODEL_ID,
    modelMap: { 'qwen3.5': DEFAULT_GATEWAY_MODEL_ID },
    aiAutoSummaryPrompt: buildDefaultAiAutoSummaryPromptTemplate(),
    dailyReportPrompt: DEFAULT_DAILY_REPORT_GENERATION_PROMPT,
    weeklyReportPrompt: DEFAULT_WEEKLY_REPORT_GENERATION_PROMPT,
  }
}

function isModelId(v: string): v is DailyReportModelId {
  return MODEL_IDS.has(v)
}

function parseModelMap(raw: unknown): Partial<Record<DailyReportModelId, string>> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<Record<DailyReportModelId, string>> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (isModelId(k) && typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return out
}

function migratePromptFromWorkRecord(): { aiAutoSummaryPrompt?: string } {
  try {
    const raw = localStorage.getItem(WORK_RECORD_SETTINGS_KEY)
    if (!raw) return {}
    const j = JSON.parse(raw) as { systemRecordPrompt?: string }
    if (typeof j.systemRecordPrompt === 'string' && j.systemRecordPrompt.trim()) {
      return { aiAutoSummaryPrompt: j.systemRecordPrompt.trim() }
    }
  } catch {
    /* ignore */
  }
  return {}
}

function loadRawConfig(): Partial<LlmUserConfig> {
  if (typeof window === 'undefined') return {}
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(STORAGE_KEY_V1)
      if (raw) {
        const migrated = normalizePartial(JSON.parse(raw) as Partial<LlmUserConfig>)
        saveLlmUserConfig({ ...defaultLlmUserConfig(), ...migrated })
        return migrated
      }
      return { ...migratePromptFromWorkRecord() }
    }
    return normalizePartial(JSON.parse(raw) as Partial<LlmUserConfig>)
  } catch {
    return {}
  }
}

function normalizePartial(
  j: Partial<LlmUserConfig> & { prompt?: string },
): Partial<LlmUserConfig> {
  const modelMap = parseModelMap(j.modelMap)
  const gatewayModelId =
    typeof j.gatewayModelId === 'string' && j.gatewayModelId.trim()
      ? j.gatewayModelId.trim()
      : modelMap['qwen3.5']?.trim() || DEFAULT_GATEWAY_MODEL_ID
  const aiAutoSummaryPrompt =
    typeof j.aiAutoSummaryPrompt === 'string' && j.aiAutoSummaryPrompt.trim()
      ? j.aiAutoSummaryPrompt.trim()
      : undefined
  const dailyFromField =
    typeof j.dailyReportPrompt === 'string' && j.dailyReportPrompt.trim()
      ? j.dailyReportPrompt.trim()
      : typeof j.prompt === 'string' && j.prompt.trim()
        ? j.prompt.trim()
        : undefined
  const dailyReportPrompt = dailyFromField
    ? normalizeStoredDailyReportPrompt(dailyFromField)
    : undefined
  const weeklyReportPrompt =
    typeof j.weeklyReportPrompt === 'string' && j.weeklyReportPrompt.trim()
      ? j.weeklyReportPrompt.trim()
      : undefined
  return {
    baseUrl: typeof j.baseUrl === 'string' ? j.baseUrl.trim() : '',
    apiKey: typeof j.apiKey === 'string' ? j.apiKey : '',
    gatewayModelId,
    modelMap,
    ...(aiAutoSummaryPrompt ? { aiAutoSummaryPrompt } : {}),
    ...(dailyReportPrompt ? { dailyReportPrompt } : {}),
    ...(weeklyReportPrompt ? { weeklyReportPrompt } : {}),
  }
}

export function loadLlmUserConfig(): LlmUserConfig {
  const fallback = defaultLlmUserConfig()
  const j = loadRawConfig()
  const promptFallback = migratePromptFromWorkRecord()
  const config: LlmUserConfig = {
    baseUrl: resolveStoredBaseUrl(j.baseUrl, fallback.baseUrl),
    apiKey: resolveStoredApiKey(j.apiKey, fallback.apiKey),
    gatewayModelId: resolveStoredGatewayModelId(j.gatewayModelId),
    modelMap: j.modelMap ?? fallback.modelMap,
    aiAutoSummaryPrompt: normalizeStoredAiAutoSummaryPrompt(
      j.aiAutoSummaryPrompt ??
        promptFallback.aiAutoSummaryPrompt ??
        fallback.aiAutoSummaryPrompt,
    ),
    dailyReportPrompt: normalizeStoredDailyReportPrompt(
      j.dailyReportPrompt ?? fallback.dailyReportPrompt,
    ),
    weeklyReportPrompt: normalizeStoredWeeklyReportPrompt(
      j.weeklyReportPrompt ?? fallback.weeklyReportPrompt,
    ),
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as Partial<LlmUserConfig> & { prompt?: string }
        const rawDaily =
          typeof stored.dailyReportPrompt === 'string'
            ? stored.dailyReportPrompt.trim()
            : typeof stored.prompt === 'string'
              ? stored.prompt.trim()
              : ''
        const rawWeekly =
          typeof stored.weeklyReportPrompt === 'string' ? stored.weeklyReportPrompt.trim() : ''
        const storedKey = typeof stored.apiKey === 'string' ? stored.apiKey.trim() : ''
        const storedBase = typeof stored.baseUrl === 'string' ? stored.baseUrl.trim() : ''
        const shouldPersistSecrets =
          storedKey === DEFAULT_LLM_API_KEY ||
          storedBase === DEFAULT_LLM_BASE_URL
        if (
          rawDaily !== config.dailyReportPrompt ||
          rawWeekly !== config.weeklyReportPrompt ||
          shouldPersistSecrets
        ) {
          saveLlmUserConfig(config)
        }
      }
    } catch {
      /* ignore */
    }
  }

  return config
}

export function loadAiAutoSummaryPrompt(): string {
  const stored = loadLlmUserConfig().aiAutoSummaryPrompt
  const periodId = loadWorkRecordSettings().systemRecordPeriod
  return resolveAiAutoSummaryPrompt(stored, periodId)
}

export function loadDailyReportGenerationPrompt(): string {
  const p = loadLlmUserConfig().dailyReportPrompt.trim()
  return p || DEFAULT_DAILY_REPORT_GENERATION_PROMPT
}

export function loadWeeklyReportGenerationPrompt(): string {
  const p = loadLlmUserConfig().weeklyReportPrompt.trim()
  return p || DEFAULT_WEEKLY_REPORT_GENERATION_PROMPT
}

export function saveLlmUserConfig(config: LlmUserConfig): void {
  if (typeof window === 'undefined') return
  const gatewayModelId = config.gatewayModelId.trim() || DEFAULT_GATEWAY_MODEL_ID
  const modelMap: Partial<Record<DailyReportModelId, string>> = { ...config.modelMap }
  modelMap['qwen3.5'] = gatewayModelId

  const storedFields = normalizeLlmConfigForStorage(config)
  const trimmed: LlmUserConfig = {
    baseUrl: storedFields.baseUrl,
    apiKey: storedFields.apiKey,
    gatewayModelId,
    modelMap: {},
    aiAutoSummaryPrompt:
      normalizeStoredAiAutoSummaryPrompt(config.aiAutoSummaryPrompt) ||
      buildDefaultAiAutoSummaryPromptTemplate(),
    dailyReportPrompt: normalizeStoredDailyReportPrompt(config.dailyReportPrompt),
    weeklyReportPrompt: normalizeStoredWeeklyReportPrompt(config.weeklyReportPrompt),
  }
  for (const m of DAILY_REPORT_MODELS) {
    const v = modelMap[m.id]?.trim()
    if (v && (m.id !== 'qwen3.5' || v !== gatewayModelId)) {
      trimmed.modelMap[m.id] = v
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function describeDefaultLlmBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_LLM_BASE_URL && String(import.meta.env.VITE_LLM_BASE_URL).trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return DEFAULT_LLM_BASE_URL
}

export const API_KEY_MASK_DISPLAY = '••••••••••••••••••••••••••••'
