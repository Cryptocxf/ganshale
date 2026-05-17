/** 用户加入「应用监控列表」的关键词，用于打工时长与时间分布统计 */

import { normalizeWindowAppKey } from './windowForegroundMatch'

export const MONITORED_APPS_CHANGED_EVENT = 'ganshale-monitored-apps-changed'

const STORAGE_KEY = 'ganshale-monitored-app-patterns-v1'

/** 办公总时长始终计入（即使用户未手动加入监控列表） */
const ESSENTIAL_OFFICE_APP_PATTERNS = ['cursor'] as const

export function notifyMonitoredAppsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MONITORED_APPS_CHANGED_EVENT))
}

/** 非空监控列表时合并必备应用（如 Cursor） */
export function withEssentialOfficePatterns(patterns: string[]): string[] {
  if (!patterns.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of [...patterns, ...ESSENTIAL_OFFICE_APP_PATTERNS]) {
    const t = p.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

export function loadMonitoredAppPatterns(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    for (const x of parsed) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim())
    }
    return withEssentialOfficePatterns(out)
  } catch {
    return []
  }
}

/** 从窗口事件的进程名推导监控关键词（不含 .exe） */
export function patternHintFromWindowApp(app: string): string {
  const raw = String(app ?? '').trim()
  if (!raw) return ''
  return raw.replace(/\.exe$/i, '').trim() || raw
}

export function addMonitoredAppPattern(pattern: string): boolean {
  const t = pattern.trim()
  if (!t) return false
  const current = loadMonitoredAppPatterns()
  if (current.some((p) => p.toLowerCase() === t.toLowerCase())) return false
  saveMonitoredAppPatterns([...current, t])
  return true
}

export function saveMonitoredAppPatterns(patterns: string[]): void {
  if (typeof window === 'undefined') return
  try {
    const cleaned = patterns.map((p) => p.trim()).filter(Boolean)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
    notifyMonitoredAppsChanged()
  } catch {
    /* quota */
  }
}

/** 进程名 + 标题 是否命中任一监控子串 */
export function foregroundMatchesMonitoredPatterns(
  app: string,
  title: string,
  patterns: string[],
): boolean {
  const effective = withEssentialOfficePatterns(patterns)
  if (!effective.length) return false
  const hay = `${String(app)} ${String(title)}`.toLowerCase()
  const appKey = normalizeWindowAppKey(app)
  return effective.some((p) => {
    const x = p.trim().toLowerCase()
    if (!x) return false
    return hay.includes(x) || appKey === x || appKey.includes(x)
  })
}
