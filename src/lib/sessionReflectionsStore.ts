const STORAGE_KEY = 'ganshale-session-reflections-v1'
const MAX_ENTRIES = 400

export type SessionReflectionEntry = {
  id: string
  savedAt: string
  text: string
  tier: number
  durationSec: number
  durationLabel?: string
  app: string
  title: string
  appPath?: string
  headline?: string
  endedAt?: string
}

export function loadSessionReflections(): SessionReflectionEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: SessionReflectionEntry[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id : ''
      const savedAt = typeof r.savedAt === 'string' ? r.savedAt : ''
      const text = typeof r.text === 'string' ? r.text : ''
      const app = typeof r.app === 'string' ? r.app : ''
      if (!id || !savedAt || !app) continue
      out.push({
        id,
        savedAt,
        text,
        tier: typeof r.tier === 'number' ? r.tier : 0,
        durationSec: typeof r.durationSec === 'number' ? r.durationSec : 0,
        durationLabel: typeof r.durationLabel === 'string' ? r.durationLabel : undefined,
        app,
        title: typeof r.title === 'string' ? r.title : '',
        appPath: typeof r.appPath === 'string' ? r.appPath : undefined,
        headline: typeof r.headline === 'string' ? r.headline : undefined,
        endedAt: typeof r.endedAt === 'string' ? r.endedAt : undefined,
      })
    }
    return out
  } catch {
    return []
  }
}

export function appendSessionReflection(
  entry: Omit<SessionReflectionEntry, 'id'> & { id?: string },
): SessionReflectionEntry {
  const id = entry.id ?? crypto.randomUUID()
  const full: SessionReflectionEntry = { ...entry, id }
  const next = [full, ...loadSessionReflections()].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return full
}
