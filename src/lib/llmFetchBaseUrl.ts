/** 开发时 Vite 代理根据该头把 /__llm 转发到用户配置的本机端口 */
export const LLM_UPSTREAM_HEADER = 'x-llm-upstream'

function parseConfiguredBaseUrl(configuredBaseUrl: string): URL | null {
  const raw = configuredBaseUrl.trim()
  if (!raw) return null
  try {
    return new URL(raw.includes('://') ? raw : `http://${raw}`)
  } catch {
    return null
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost'
}

/** 是否为本机网关（开发模式走同源代理以避免 CORS） */
export function isLocalLlmGateway(configuredBaseUrl: string): boolean {
  const u = parseConfiguredBaseUrl(configuredBaseUrl)
  return u ? isLocalHostname(u.hostname) : false
}

/** 开发 + 本机网关：返回 Vite /__llm 同源地址；否则返回原 baseUrl */
export function resolveLlmFetchBaseUrl(configuredBaseUrl: string): string {
  const base = configuredBaseUrl.trim().replace(/\/+$/, '')
  if (!base) return base
  if (!import.meta.env.DEV || typeof window === 'undefined') return base

  const u = parseConfiguredBaseUrl(base)
  if (!u || !isLocalHostname(u.hostname)) return base

  const origin = window.location.origin.replace(/\/+$/, '')
  const path = u.pathname.replace(/\/+$/, '') || ''
  return `${origin}/__llm${path}`
}

/** 开发 + 本机网关：告知 Vite 代理真实 upstream（protocol//host） */
export function llmUpstreamHeaders(
  configuredBaseUrl: string,
): Record<string, string> {
  if (!import.meta.env.DEV) return {}
  const u = parseConfiguredBaseUrl(configuredBaseUrl)
  if (!u || !isLocalHostname(u.hostname)) return {}
  return { [LLM_UPSTREAM_HEADER]: u.origin }
}
