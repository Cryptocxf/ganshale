/** 用户自定义应用展示名（按 identityKey，全局生效） */

export const APP_DISPLAY_NAMES_CHANGED_EVENT = 'ganshale-app-display-names-changed'

const STORAGE_KEY = 'ganshale-app-display-names-v1'

export function notifyAppDisplayNamesChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(APP_DISPLAY_NAMES_CHANGED_EVENT))
}

export function loadAppDisplayNameOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && typeof v === 'string' && v.trim()) {
        out[k] = v.trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

function saveAppDisplayNameOverrides(map: Record<string, string>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getAppDisplayNameOverride(identityKey: string): string | undefined {
  return loadAppDisplayNameOverrides()[identityKey]
}

/** 设置自定义名；空字符串则清除覆盖，恢复默认展示名 */
export function setAppDisplayNameOverride(identityKey: string, name: string): void {
  const key = identityKey.trim()
  if (!key) return
  const trimmed = name.trim()
  const map = loadAppDisplayNameOverrides()
  if (!trimmed) {
    delete map[key]
  } else {
    map[key] = trimmed
  }
  saveAppDisplayNameOverrides(map)
  notifyAppDisplayNamesChanged()
}
