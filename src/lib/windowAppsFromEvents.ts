import type { AwEvent } from './awTypes'
import { patternHintFromWindowApp } from './monitoredAppsStore'
import { identityFromEventData } from './windowAppDisplay'

export type WindowAppSummary = {
  app: string
  appPath?: string
  patternHint: string
  label: string
}

/** 从窗口事件去重，得到与「实时窗口记录」一致的应用列表 */
export function uniqueAppsFromWindowEvents(events: AwEvent[]): WindowAppSummary[] {
  const map = new Map<string, WindowAppSummary>()
  for (const ev of events) {
    const appRaw = String(ev.data.app ?? '').trim()
    if (!appRaw) continue
    const appPath = String(ev.data.appPath ?? '').trim()
    const id = identityFromEventData(ev.data)
    const key = id.identityKey
    if (map.has(key)) continue
    const patternHint = patternHintFromWindowApp(appRaw)
    if (!patternHint) continue
    map.set(key, {
      app: appRaw,
      appPath: appPath || undefined,
      patternHint,
      label: id.displayName,
    })
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}
