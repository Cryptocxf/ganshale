const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('reflectPrompt', {
  /**
   * @param {(payload: object) => void} cb
   * @returns {() => void}
   */
  onInit: (cb) => {
    const ch = 'reflect-init'
    const fn = (_event, payload) => {
      try {
        cb(payload)
      } catch {
        /* ignore */
      }
    }
    ipcRenderer.on(ch, fn)
    return () => ipcRenderer.removeListener(ch, fn)
  },
  /** @param {{ text: string; meta: object }} payload */
  submit: (payload) => ipcRenderer.invoke('reflect-prompt:submit', payload),
  skip: () => ipcRenderer.invoke('reflect-prompt:skip'),
})
