import type { AwEvent } from './awTypes'
import type { LiveForegroundSample } from './liveForeground'
import { normalizeWindowAppKey } from './windowForegroundMatch'

/** Electron 开发壳进程名（active-win 常为 electron.exe，即本应用窗口） */
export function isElectronShellApp(app: string): boolean {
  return normalizeWindowAppKey(app) === 'electron'
}

/**
 * 是否为本应用（Ganshale）窗口（用于回顾弹窗等，不排除采集与统计）。
 * - 打包后主程序名为 ganshale.exe
 * - 开发态为 electron.exe 且路径/标题含 ganshale 或「干啥了」
 */
export function isGanshaleSelfWindowRecord(
  app: string,
  title: string,
  appPath?: string,
): boolean {
  const a = app.toLowerCase().trim()
  const p = (appPath ?? '').toLowerCase().replace(/\\/g, '/')
  const t = title.toLowerCase()

  if (a === 'ganshale.exe' || a === 'ganshale') return true
  if (isElectronShellApp(app)) {
    return (
      p.includes('ganshale') ||
      t.includes('ganshale') ||
      t.includes('干啥了') ||
      t.includes('天哪，你每天都干啥了')
    )
  }
  if (
    (t.includes('干啥了') || t.includes('天哪，你每天都干啥了')) &&
    (a === 'ganshale.exe' || a === 'ganshale' || isElectronShellApp(app))
  ) {
    return true
  }
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
 * 不参与窗口时长、时间轴、分类聚合与列表展示的事件（仅资源管理器）。
 */
export function shouldSkipWindowEventForStats(ev: AwEvent): boolean {
  return isWindowsExplorerWindowEvent(ev)
}

/** 过滤 Windows 资源管理器（explorer），用于列表与下游统计 */
export function excludeGanshaleSelfWindowEvents(events: AwEvent[]): AwEvent[] {
  return events.filter((ev) => !shouldSkipWindowEventForStats(ev))
}

/** 实时前台采样是否不参与延伸统计（资源管理器） */
export function isLiveForegroundSkippedForStats(live: LiveForegroundSample): boolean {
  return isWindowsExplorerApp(live.app ?? '')
}
