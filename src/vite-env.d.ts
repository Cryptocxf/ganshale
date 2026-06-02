/// <reference types="vite/client" />

import type { LiveForegroundSample } from './lib/liveForeground'

interface ImportMetaEnv {
  readonly VITE_LLM_BASE_URL?: string
  /** 仅 dev：`/__llm` 代理转发的目标（默认 http://127.0.0.1:15678） */
  readonly VITE_LLM_PROXY_TARGET?: string
  readonly VITE_LLM_API_KEY?: string
  /**
   * JSON：按下拉项 `id` 覆盖发给网关的 `model`（如 `{"qwen3.5":"qwen3.5-hy"}`）。
   */
  readonly VITE_LLM_MODEL_MAP?: string
}

/** 注册表 Uninstall 归一化后的已安装应用条目 */
interface InstalledAppRow {
  displayName: string
  patternHint: string
  exePath?: string
  iconPath?: string
}

interface GanshaleDesktopBridge {
  platform: string
  windowTrackingSupported: () => Promise<{ supported: boolean; platform: string }>
  startWindowTracking: () => Promise<{
    ok: boolean
    error?: string
    intervalMs?: number
  }>
  stopWindowTracking: () => Promise<{ ok: boolean }>
  /** 按关键词搜索本机应用（注册表 App Paths、PATH、运行中进程等） */
  searchLocalApps: (query: string) => Promise<{
    ok: boolean
    hits?: { name: string; path?: string }[]
    error?: string
  }>
  /** 与系统「已安装的应用」同源（Windows：Uninstall 注册表） */
  listInstalledApps: () => Promise<{
    ok: boolean
    items?: InstalledAppRow[]
    error?: string
  }>
  /** 打开系统「已安装的应用」界面 */
  openInstalledAppsSettings: () => Promise<{ ok: boolean; error?: string }>
  /** 系统「下载」文件夹路径（导出文件默认落盘位置） */
  getDownloadPath: () => Promise<{ ok: boolean; path?: string; error?: string }>
  /** 在资源管理器中打开目录 */
  openPathInFolder: (targetPath: string) => Promise<{ ok: boolean; error?: string }>
  /** 当前 userData 目录（安装目录下 data） */
  getStoragePath: () => Promise<{ ok: boolean; path?: string; error?: string }>
  /** 主进程 `app.getFileIcon`，返回 PNG data URL */
  getFileIcon: (filePath: string) => Promise<string | null>
  /** 主窗口已显示（`ready-to-show` 之后），用于启动页计时 */
  onMainWindowShown?: (cb: () => void) => () => void
  onForegroundWindow: (cb: (payload: LiveForegroundSample | null) => void) => () => void
  /** 最小化回顾弹窗保存后，主进程把记录发到渲染进程 */
  onSessionReflection?: (cb: (payload: Record<string, unknown>) => void) => () => void
  showTodoReminder?: (payload: {
    todoId?: string
    title: string
    body?: string
    priority?: number
  }) => Promise<{ ok: boolean; error?: string }>
  setReflectPromptEnabled?: (enabled: boolean) => Promise<{ ok: boolean }>
}

declare global {
  /** 构建时由 Vite 从 package.json 注入 */
  const __APP_VERSION__: string

  interface Window {
    ganshaleDesktop?: GanshaleDesktopBridge
  }
}

export {}
