import type { AwEvent } from './awTypes'
import type { LiveForegroundSample } from './liveForeground'
import { normalizeWindowAppKey } from './windowForegroundMatch'

/** Electron 开发壳进程名（active-win 常为 electron.exe，即本应用窗口） */
export function isElectronShellApp(app: string): boolean {
  return normalizeWindowAppKey(app) === 'electron'
}

/**
 * 是否为本应用（Ganshale）窗口：此类记录不写库、不参与统计与列表。
 * - 打包后主程序名为 ganshale.exe
 * - 开发态统一排除 electron.exe（本应用 Electron 壳）
 * - 路径含 ganshale 的 electron 亦排除（双保险）
 */
export function isGanshaleSelfWindowRecord(
  app: string,
  title: string,
  appPath?: string,
): boolean {
  if (isElectronShellApp(app)) return true

  const a = app.toLowerCase()
  const p = (appPath ?? '').toLowerCase().replace(/\\/g, '/')
  const t = title.toLowerCase()

  if (a === 'ganshale.exe') return true
  if (p.includes('ganshale') && a.includes('electron')) return true
  if (t.includes('干啥了') && (a === 'ganshale.exe' || isElectronShellApp(app))) return true
  return false
}

export function isGanshaleSelfWindowEvent(ev: AwEvent): boolean {
  return isGanshaleSelfWindowRecord(
    String(ev.data.app ?? ''),
    String(ev.data.title ?? ''),
    String(ev.data.appPath ?? ''),
  )
}

/** Windows 资源管理器进程名（大小写不敏感，可带 .exe） */
export function isWindowsExplorerApp(app: string): boolean {
  const a = String(app ?? '')
    .toLowerCase()
    .trim()
    .replace(/\.exe$/i, '')
  return a === 'explorer'
}

/** Windows 资源管理器：不计入窗口停留时长与相关统计 */
export function isWindowsExplorerWindowEvent(ev: AwEvent): boolean {
  return isWindowsExplorerApp(String(ev.data.app ?? ''))
}

/**
 * 不参与窗口时长、时间轴、分类聚合与列表展示的事件（本应用自身 + 资源管理器）。
 */
export function shouldSkipWindowEventForStats(ev: AwEvent): boolean {
  return isGanshaleSelfWindowEvent(ev) || isWindowsExplorerWindowEvent(ev)
}

/** 过滤本应用自身窗口 + Windows 资源管理器（explorer），用于列表与下游统计 */
export function excludeGanshaleSelfWindowEvents(events: AwEvent[]): AwEvent[] {
  return events.filter((ev) => !shouldSkipWindowEventForStats(ev))
}

/** 实时前台采样是否不参与延伸统计（本应用 / 资源管理器） */
export function isLiveForegroundSkippedForStats(live: LiveForegroundSample): boolean {
  return (
    isGanshaleSelfWindowRecord(live.app, live.title, live.appPath) ||
    isWindowsExplorerApp(live.app ?? '')
  )
}
