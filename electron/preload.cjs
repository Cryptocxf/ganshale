const { contextBridge, ipcRenderer } = require('electron')

/**
 * @typedef {{ app: string; title: string; capturedAt: string; segmentStartedAt?: string; appPath?: string } | null} ForegroundPayload
 */

contextBridge.exposeInMainWorld('ganshaleDesktop', {
  platform: process.platform,

  /** @returns {Promise<{ supported: boolean; platform: string }>} */
  windowTrackingSupported: () => ipcRenderer.invoke('ganshale:window-tracking-supported'),

  /** @returns {Promise<{ ok: boolean; error?: string; intervalMs?: number }>} */
  startWindowTracking: () => ipcRenderer.invoke('ganshale:start-window-tracking'),

  /** @returns {Promise<{ ok: boolean }>} */
  stopWindowTracking: () => ipcRenderer.invoke('ganshale:stop-window-tracking'),


  /** @returns {Promise<{ ok: boolean; items?: { displayName: string; patternHint: string; exePath?: string; iconPath?: string }[]; error?: string }>} */
  listInstalledApps: () => ipcRenderer.invoke('ganshale:list-installed-apps'),

  /** 打开系统「已安装的应用」相关界面（Windows：设置；macOS：应用程序） */
  /** @returns {Promise<{ ok: boolean; error?: string }>} */
  openInstalledAppsSettings: () => ipcRenderer.invoke('ganshale:open-installed-apps-settings'),

  /** @returns {Promise<{ ok: boolean; path?: string; error?: string }>} */
  getDownloadPath: () => ipcRenderer.invoke('ganshale:get-download-path'),

  /** @param {string} targetPath */
  /** @returns {Promise<{ ok: boolean; error?: string }>} */
  openPathInFolder: (targetPath) =>
    ipcRenderer.invoke('ganshale:open-path-in-folder', targetPath),

  getStoragePath: () => ipcRenderer.invoke('ganshale:get-storage-path'),

  /**
   * @param {{ vaultPath: string; relativePath: string; content: string }} payload
   * @returns {Promise<{ ok: boolean; filePath?: string; error?: string }>}
   */
  writeObsidianReport: (payload) =>
    ipcRenderer.invoke('ganshale:write-obsidian-report', payload),

  /** @param {string} query */
  /** @returns {Promise<{ ok: boolean; hits?: { name: string; path?: string }[]; error?: string }>} */
  searchLocalApps: (query) => ipcRenderer.invoke('ganshale:search-local-apps', query),

  /** @param {string} filePath 可执行文件等完整路径 */
  /** @returns {Promise<string | null>} PNG data URL 或 null */
  getFileIcon: (filePath) => ipcRenderer.invoke('ganshale:get-file-icon', filePath),

  /**
   * @param {(payload: ForegroundPayload) => void} callback
   * @returns {() => void} unsubscribe
   */
  /**
   * 主窗口 `ready-to-show` 并已 `show()` 后触发；用于启动页在窗口可见后再计时。
   * @param {() => void} callback
   * @returns {() => void} unsubscribe
   */
  onMainWindowShown: (callback) => {
    const channel = 'ganshale:main-window-shown'
    let listener = null
    let cancelled = false
    const run = () => {
      if (cancelled) return
      try {
        callback()
      } catch {
        /* ignore */
      }
    }
    void ipcRenderer.invoke('ganshale:was-main-window-shown').then((shown) => {
      if (cancelled) return
      if (shown) {
        run()
        return
      }
      listener = () => run()
      ipcRenderer.once(channel, listener)
    })
    return () => {
      cancelled = true
      if (listener) ipcRenderer.removeListener(channel, listener)
    }
  },

  onForegroundWindow: (callback) => {
    const channel = 'ganshale:foreground-window'
    const listener = (_event, payload) => {
      try {
        callback(payload)
      } catch {
        /* ignore */
      }
    }
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  /**
   * 最小化回顾弹窗提交后由主进程转发（含 text、应用与时长等元数据）。
   * @param {(payload: Record<string, unknown>) => void} callback
   * @returns {() => void} unsubscribe
   */
  /**
   * 待办提醒：主进程在屏幕右下角弹出小窗
   * @param {{ todoId?: string; title: string; body?: string; priority?: number }} payload
   */
  showTodoReminder: (payload) => ipcRenderer.invoke('ganshale:show-todo-reminder', payload),

  /** 与设置页「开启小回顾弹窗」同步 */
  setReflectPromptEnabled: (enabled) =>
    ipcRenderer.invoke('ganshale:set-reflect-prompt-enabled', enabled),

  onSessionReflection: (callback) => {
    const channel = 'ganshale:session-reflection'
    const listener = (_event, payload) => {
      try {
        callback(payload)
      } catch {
        /* ignore */
      }
    }
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  /**
   * 屏幕锁屏状态变更：锁屏时回调 true，解锁时回调 false。
   * @param {(locked: boolean) => void} callback
   * @returns {() => void} unsubscribe
   */
  onScreenLockChange: (callback) => {
    const lockListener = () => {
      try { callback(true) } catch { /* ignore */ }
    }
    const unlockListener = () => {
      try { callback(false) } catch { /* ignore */ }
    }
    ipcRenderer.on('ganshale:screen-locked', lockListener)
    ipcRenderer.on('ganshale:screen-unlocked', unlockListener)
    return () => {
      ipcRenderer.removeListener('ganshale:screen-locked', lockListener)
      ipcRenderer.removeListener('ganshale:screen-unlocked', unlockListener)
    }
  },
})
