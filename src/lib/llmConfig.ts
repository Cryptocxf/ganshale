/**
 * OpenAI 兼容网关：统一从「设置 → 模型配置」读取 URL、Key、模型 ID。
 */
import type { DailyReportModelId } from './dailyReportPrefs'
import { DAILY_REPORT_MODELS } from './dailyReportPrefs'
import {
  DEFAULT_GATEWAY_MODEL_ID,
  DEFAULT_LLM_API_KEY,
  describeDefaultLlmBaseUrl,
  loadLlmUserConfig,
  type LlmUserConfig,
} from './llmUserConfig'

export type LlmInvokeConfig = {
  baseUrl: string
  apiKey: string
  model: string
}

export function getDefaultApiKey(): string {
  return (
    (import.meta.env.VITE_LLM_API_KEY && String(import.meta.env.VITE_LLM_API_KEY).trim()) ||
    DEFAULT_LLM_API_KEY
  )
}

function defaultLlmBaseUrl(): string {
  return describeDefaultLlmBaseUrl()
}

/** 设置页保存的网关 model id（如 qwen3.5-hy） */
export function getConfiguredGatewayModel(): string {
  const id = loadLlmUserConfig().gatewayModelId.trim()
  return id || DEFAULT_GATEWAY_MODEL_ID
}

export function getLlmRuntimeConfigForUser(user: LlmUserConfig): {
  baseUrl: string
  apiKey: string
} {
  const baseUrl = (user.baseUrl.trim() || defaultLlmBaseUrl()).replace(/\/+$/, '')
  const apiKey = user.apiKey.trim() || getDefaultApiKey()
  return { baseUrl, apiKey }
}

export function getLlmRuntimeConfig(): { baseUrl: string; apiKey: string } {
  return getLlmRuntimeConfigForUser(loadLlmUserConfig())
}

/** 所有大模型请求统一使用此项（URL、Key、model） */
export function getLlmInvokeConfig(): LlmInvokeConfig {
  const runtime = getLlmRuntimeConfig()
  return {
    ...runtime,
    model: getConfiguredGatewayModel(),
  }
}

export function getLlmInvokeConfigForUser(user: LlmUserConfig): LlmInvokeConfig {
  const runtime = getLlmRuntimeConfigForUser(user)
  const model = user.gatewayModelId.trim() || DEFAULT_GATEWAY_MODEL_ID
  return { ...runtime, model }
}

/** @deprecated 请使用 getConfiguredGatewayModel；保留签名兼容旧调用 */
export function getResolvedApiModel(_modelId?: DailyReportModelId): string {
  return getConfiguredGatewayModel()
}

export function getResolvedApiModelForConfig(user: LlmUserConfig): string {
  return user.gatewayModelId.trim() || DEFAULT_GATEWAY_MODEL_ID
}

/** 聊天气泡头像：按网关 model 字符串匹配内置列表 */
export function gatewayModelToUiModelId(gatewayModel: string): DailyReportModelId {
  const norm = gatewayModel.trim().toLowerCase()
  const exact = DAILY_REPORT_MODELS.find((m) => m.apiModel.toLowerCase() === norm)
  if (exact) return exact.id
  if (norm.includes('minimax')) return 'minimax-M2.5'
  if (norm.includes('flash') && norm.includes('deepseek')) return 'deepseek-v4-flash'
  if (norm.includes('deepseek')) return 'deepseek-v4-pro'
  if (norm.includes('doubao') || norm.includes('seed')) return 'doubao-seed-2.0-mini'
  return 'qwen3.5'
}
