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

  pickStorageDirectory: () => ipcRenderer.invoke('ganshale:pick-storage-directory'),

  setStorageDirectory: (nextPath) =>
    ipcRenderer.invoke('ganshale:set-storage-directory', nextPath),

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
})
