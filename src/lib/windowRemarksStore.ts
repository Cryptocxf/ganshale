const STORAGE_KEY = 'ganshale-window-remarks-v1'

export function loadWindowRemarks(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

/** 空字符串则删除该条备注 */
export function upsertWindowRemark(eventId: string, text: string): void {
  const all = loadWindowRemarks()
  const trimmed = text.trim()
  if (trimmed) all[eventId] = trimmed
  else delete all[eventId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
