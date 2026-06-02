const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('todoReminder', {
  onInit: (callback) => {
    ipcRenderer.once('todo-reminder:init', (_e, meta) => {
      try {
        callback(meta)
      } catch {
        /* ignore */
      }
    })
  },
  dismiss: () => ipcRenderer.invoke('todo-reminder:dismiss'),
})
