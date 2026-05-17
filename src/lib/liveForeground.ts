export interface LiveForegroundSample {
  app: string
  title: string
  capturedAt: string
  /** 当前前台应用连续停留起点（主进程在应用切换时更新） */
  segmentStartedAt?: string
  /** 可执行文件完整路径（Electron + active-win），用于系统图标 */
  appPath?: string
}
