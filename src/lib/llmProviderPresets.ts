export type LlmProviderPreset = {
  id: string
  label: string
  baseUrl: string
  modelId: string
  apiKeyHint: string
}

/** OpenAI 兼容网关常用供应商（用户仍需自行填写 API Key） */
export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o-mini',
    apiKeyHint: '在 platform.openai.com 创建 API Key，以 sk- 开头。',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelId: 'deepseek-chat',
    apiKeyHint: '在 platform.deepseek.com 获取 API Key。',
  },
  {
    id: 'moonshot',
    label: 'Moonshot（月之暗面）',
    baseUrl: 'https://api.moonshot.cn/v1',
    modelId: 'moonshot-v1-8k',
    apiKeyHint: '在 platform.moonshot.cn 控制台获取 API Key。',
  },
  {
    id: 'zhipu',
    label: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelId: 'glm-4-flash',
    apiKeyHint: '在 open.bigmodel.cn 控制台获取 API Key。',
  },
  {
    id: 'dashscope',
    label: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelId: 'qwen-plus',
    apiKeyHint: '在阿里云百炼控制台创建 API Key（DashScope）。',
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    modelId: 'deepseek-ai/DeepSeek-V3',
    apiKeyHint: '在 cloud.siliconflow.cn 获取 API Key。',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelId: 'openai/gpt-4o-mini',
    apiKeyHint: '在 openrouter.ai 获取 API Key；模型 ID 格式为 provider/model。',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelId: 'llama-3.3-70b-versatile',
    apiKeyHint: '在 console.groq.com 获取 API Key。',
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    apiKeyHint: '在 api.together.xyz 获取 API Key。',
  },
  {
    id: 'ollama',
    label: 'Ollama（本地）',
    baseUrl: 'http://127.0.0.1:11434/v1',
    modelId: 'llama3.2',
    apiKeyHint: '本地 Ollama 一般可填 ollama 或任意非空字符串；须先 ollama serve。',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio（本地）',
    baseUrl: 'http://127.0.0.1:1234/v1',
    modelId: '',
    apiKeyHint: '在 LM Studio 开启本地服务器后，填写实际加载的模型 ID；Key 可填 lm-studio。',
  },
  {
    id: 'custom',
    label: '自定义 OpenAI 兼容网关',
    baseUrl: '',
    modelId: '',
    apiKeyHint: '填写网关根路径（须含 /v1）、API Key 与模型 ID。',
  },
]

export function findLlmProviderPreset(id: string): LlmProviderPreset | undefined {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === id)
}

/** 根据已填写的网关地址与模型 ID 猜测当前供应商（用于下拉回显） */
export function guessLlmProviderPresetId(baseUrl: string, modelId: string): string {
  const norm = baseUrl.trim().replace(/\/+$/, '').toLowerCase()
  const model = modelId.trim()
  if (!norm) return 'custom'
  const hit = LLM_PROVIDER_PRESETS.find(
    (p) => p.id !== 'custom' && p.baseUrl.replace(/\/+$/, '').toLowerCase() === norm,
  )
  if (hit) {
    if (!model || hit.modelId === model) return hit.id
    return 'custom'
  }
  if (/11434/.test(norm)) return 'ollama'
  if (/1234/.test(norm)) return 'lmstudio'
  return 'custom'
}
