export type DailyReportModelId =
  | 'qwen3.5'
  | 'minimax-M2.5'
  | 'deepseek-v4-pro'
  | 'deepseek-v4-flash'
  | 'doubao-seed-2.0-mini'

export const DAILY_REPORT_MODELS: {
  id: DailyReportModelId
  label: string
  /**
   * 发给兼容 OpenAI 的网关时 `body.model` 的值（须与网关侧配置一致，如 `qwen3-max`）。
   * 仍可用环境变量 `VITE_LLM_MODEL_MAP`（JSON）按下拉 `id` 覆盖。
   */
  apiModel: string
  /** 悬停于当前选中项时展示的简短说明 */
  intro: string
}[] = [
  {
    id: 'qwen3.5',
    label: 'Qwen 3.5',
    apiModel: 'qwen3-max',
    intro: '通义千问系通用模型，中文理解与长文写作较均衡，适合日报归纳与要点提炼。',
  },
  {
    id: 'minimax-M2.5',
    label: 'MiniMax M2.5',
    apiModel: 'MiniMax-M2.5-hy',
    intro: 'MiniMax 对话模型，响应较快，适合多轮梳理与结构化输出。',
  },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    apiModel: 'deepseek-v4-pro-hy',
    intro: 'DeepSeek 偏强推理与长上下文版本，适合复杂归纳与细致分析类日报。',
  },
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    apiModel: 'deepseek-v4-flash-hy',
    intro: '轻量快速版，适合快速出稿、短篇幅总结。',
  },
  {
    id: 'doubao-seed-2.0-mini',
    label: '豆包 Seed 2.0 Mini',
    apiModel: 'doubao-seed-2.0-mini-hy',
    intro: '字节豆包小尺寸模型，省资源、低延迟，适合简短摘要与草稿。',
  },
]

/** 简洁日报：内置默认全文（可经「编辑」覆盖并持久化） */
export const CONCISE_DAILY_REPORT_PROMPT = [
  '## 角色',
  '你是一位专业的行政助理，擅长从杂乱的原始数据中提取关键信息，生成极简风格的工作日报。',
  '',
  '## 任务',
  '请根据我提供的【今日时间线数据】，生成一份**简洁日报**。',
  '',
  '## 要求',
  '1.  **格式**：严格使用无序列表（- 开头）。',
  '2.  **时长**：每条工作项后需用括号注明耗时，例如 `（1.5h）`。',
  '3.  **过滤**：忽略所有时长少于15分钟的任务、纯粹的软件/网页名（如“Chrome”）、以及非工作浏览（如微博、B站）。',
  '4.  **合并**：将相近、连续的同类工作合并为一条。例如“写代码09:30-10:20”和“调试10:20-11:00”合并为“开发XX功能（2.5h）”。',
  '5.  **精炼**：每行描述不超过15个字，直击动作和对象。',
  '',
  '## 输出示例',
  '- 完成登录模块开发 (2h)',
  '- 参加需求评审会议 (1h)',
  '- 修复用户反馈的Bug#2245 (0.5h)',
].join('\n')

/** 详细日报：内置默认全文（可经「编辑」覆盖并持久化） */
export const DETAILED_DAILY_REPORT_PROMPT = [
  '## 角色',
  '你是一位严谨的项目助理，擅长从时间线中结构化地提炼出“结果”与“价值”，生成一份详实的工作日报。',
  '',
  '## 任务',
  '请根据我提供的【今日时间线数据】，生成一份**详细日报**。',
  '',
  '## 要求',
  '1.  **格式**：严格使用Markdown标题（## 今日工作概览、## 详细工作内容、## 工作复盘与备注），但内容不适用表格。',
  '2.  **时长统计**：在“今日工作概览”部分，按我的预设分类（开发、会议、文档、沟通）统计时长，并计算总专注时长。',
  '3.  **内容提炼**：在“详细工作内容”部分，按时间顺序列出。每条需包含：具体时间段、动作、目标/产出物。对于如“VS Code”这样的记录，请结合文件名推测具体任务（如“修改user_model.py”-> “更新用户数据模型”）。',
  '4.  **补充说明**：在“工作复盘与备注”部分，根据相邻工作的中断或切换（例如：写代码后被会议打断），推测可能遇到的阻塞或上下文切换成本。',
  '5.  **延伸规划**：在末尾用“## 明日计划”小节，根据今日未完成或依赖项，简要列出2-3条合理的明日待办。',
  '',
  '## 输出示例（示意结构）',
  '## 今日工作概览',
  '总专注时长：6.5小时',
  '- 开发：4h',
  '- 会议：1.5h',
  '- 沟通：1h',
  '',
  '## 详细工作内容',
  '- **09:30-11:00 开发**：实现用户登录接口，完成单元测试。',
  '- **11:00-12:00 会议**：参加“2.0版本技术方案评审会”，确定技术栈选型。',
  '- ……',
  '',
  '## 工作复盘与备注',
  '- 下午被3次临时沟通打断，导致集中编码时间被碎片化。',
  '',
  '## 明日计划',
  '- 完成登录模块与前端联调。',
  '- 编写技术方案评审会议纪要。',
].join('\n')

export type DailyReportPromptPresetId = 'concise' | 'detailed'

export const DAILY_REPORT_PROMPT_PRESETS: {
  id: DailyReportPromptPresetId
  label: string
}[] = [
  { id: 'concise', label: '简洁日报' },
  { id: 'detailed', label: '详细日报' },
]

export interface DailyReportPrefs {
  modelId: DailyReportModelId
  promptPresetId: DailyReportPromptPresetId
  promptConcise: string
  promptDetailed: string
}

export function effectiveDailyReportPrompt(
  prefs: Pick<DailyReportPrefs, 'promptPresetId' | 'promptConcise' | 'promptDetailed'>,
): string {
  return prefs.promptPresetId === 'concise' ? prefs.promptConcise : prefs.promptDetailed
}

const STORAGE_KEY_V2 = 'ganshale-daily-report-prefs-v2'
const STORAGE_KEY_V1 = 'ganshale-daily-report-prefs-v1'

const MODEL_IDS = new Set<string>(DAILY_REPORT_MODELS.map((m) => m.id))

function isModelId(x: string): x is DailyReportModelId {
  return MODEL_IDS.has(x as DailyReportModelId)
}

const PRESET_IDS = new Set<string>(DAILY_REPORT_PROMPT_PRESETS.map((p) => p.id))

function isPromptPresetId(x: string): x is DailyReportPromptPresetId {
  return PRESET_IDS.has(x)
}

function defaultPrefs(): DailyReportPrefs {
  return {
    modelId: 'qwen3.5',
    promptPresetId: 'concise',
    promptConcise: CONCISE_DAILY_REPORT_PROMPT,
    promptDetailed: DETAILED_DAILY_REPORT_PROMPT,
  }
}

/** 从 v1 迁移：尽量保留模型与自定义单段提示到「简洁日报」 */
function migrateFromV1(raw: string): DailyReportPrefs | null {
  try {
    const j = JSON.parse(raw) as Partial<{
      modelId: string
      prompt: string
      promptPresetId: string
    }>
    const base = defaultPrefs()
    const modelId =
      typeof j.modelId === 'string' && isModelId(j.modelId) ? j.modelId : base.modelId
    let promptPresetId: DailyReportPromptPresetId = 'concise'
    if (j.promptPresetId === 'detailed') promptPresetId = 'detailed'
    else if (j.promptPresetId === 'brief' || j.promptPresetId === 'default')
      promptPresetId = 'concise'
    else if (j.promptPresetId === 'custom' && typeof j.prompt === 'string' && j.prompt.trim()) {
      return {
        modelId,
        promptPresetId: 'concise',
        promptConcise: j.prompt.trim(),
        promptDetailed: DETAILED_DAILY_REPORT_PROMPT,
      }
    }
    return {
      modelId,
      promptPresetId,
      promptConcise: CONCISE_DAILY_REPORT_PROMPT,
      promptDetailed: DETAILED_DAILY_REPORT_PROMPT,
    }
  } catch {
    return null
  }
}

export function loadDailyReportPrefs(): DailyReportPrefs {
  const fallback = defaultPrefs()
  if (typeof window === 'undefined') return fallback
  try {
    let raw = localStorage.getItem(STORAGE_KEY_V2)
    if (!raw) {
      const legacy = localStorage.getItem(STORAGE_KEY_V1)
      if (legacy) {
        const migrated = migrateFromV1(legacy)
        if (migrated) {
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated))
          return migrated
        }
      }
      return fallback
    }
    const j = JSON.parse(raw) as Partial<DailyReportPrefs>
    const modelId =
      typeof j.modelId === 'string' && isModelId(j.modelId) ? j.modelId : fallback.modelId
    const promptPresetId =
      typeof j.promptPresetId === 'string' && isPromptPresetId(j.promptPresetId)
        ? j.promptPresetId
        : fallback.promptPresetId
    const promptConcise =
      typeof j.promptConcise === 'string' && j.promptConcise.trim()
        ? j.promptConcise.trim()
        : CONCISE_DAILY_REPORT_PROMPT
    const promptDetailed =
      typeof j.promptDetailed === 'string' && j.promptDetailed.trim()
        ? j.promptDetailed.trim()
        : DETAILED_DAILY_REPORT_PROMPT
    return { modelId, promptPresetId, promptConcise, promptDetailed }
  } catch {
    return fallback
  }
}

export function saveDailyReportPrefs(partial: Partial<DailyReportPrefs>): void {
  const cur = loadDailyReportPrefs()
  const next: DailyReportPrefs = {
    modelId: partial.modelId ?? cur.modelId,
    promptPresetId: partial.promptPresetId ?? cur.promptPresetId,
    promptConcise: partial.promptConcise !== undefined ? partial.promptConcise : cur.promptConcise,
    promptDetailed: partial.promptDetailed !== undefined ? partial.promptDetailed : cur.promptDetailed,
  }
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next))
}
