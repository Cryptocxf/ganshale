const { autoUpdater } = require('electron-updater')

function registerUpdater({ app, ipcMain, beforeInstall, log }) {
  let state = { status: 'idle', version: app.getVersion(), message: '点击检查 GitHub 上的新版本', percent: 0 }
  let nextCheckAt = 0
  const setState = (patch) => { state = { ...state, ...patch } }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  // 直接读取公开 Release 附件，避免 GitHub provider 查询 api.github.com 的匿名限额。
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://github.com/Cryptocxf/ganshale/releases/latest/download/',
    useMultipleRangeRequest: false,
  })
  autoUpdater.on('checking-for-update', () => setState({ status: 'checking', message: '正在检查更新…' }))
  autoUpdater.on('update-available', (info) => setState({ status: 'available', version: info.version, message: `发现新版本 v${info.version}`, percent: 0 }))
  autoUpdater.on('update-not-available', () => setState({ status: 'current', message: '当前已是最新版本' }))
  autoUpdater.on('download-progress', (progress) => setState({ status: 'downloading', percent: progress.percent, message: '正在下载更新…' }))
  autoUpdater.on('update-downloaded', (info) => setState({ status: 'downloaded', version: info.version, percent: 100, message: '下载完成，可以重启安装更新' }))
  const failed = (error) => {
    log.write('update failed', error)
    nextCheckAt = Date.now() + 60_000
    const message = String(error.message || error)
    const limited = /429|rate.limit|rate limit/i.test(message)
    setState({ status: 'error', message: limited
      ? 'GitHub 暂时限制了请求，请等待 1 分钟后再试，也可打开下方版本记录手动下载。'
      : '更新检查或下载失败，请确认网络可访问 GitHub，且最新正式 Release 包含 latest.yml 和对应安装包。1 分钟后可重试。' })
  }
  autoUpdater.on('error', failed)
  ipcMain.handle('ganshale:update-state', () => ({ ...state, packaged: app.isPackaged }))
  ipcMain.handle('ganshale:check-update', async () => {
    if (!app.isPackaged) return { ...state, status: 'development', message: '开发模式不安装更新，请在打包后的客户端中检查更新。' }
    if (['checking', 'downloading', 'downloaded'].includes(state.status)) return state
    if (Date.now() < nextCheckAt) return state
    nextCheckAt = Date.now() + 5 * 60_000
    try { await autoUpdater.checkForUpdates() } catch (error) { failed(error) }
    return state
  })
  ipcMain.handle('ganshale:download-update', async () => {
    if (!app.isPackaged || state.status !== 'available') return state
    setState({ status: 'downloading', message: '准备下载更新…', percent: 0 })
    void autoUpdater.downloadUpdate().catch(failed)
    return state
  })
  ipcMain.handle('ganshale:install-update', () => {
    if (!app.isPackaged || state.status !== 'downloaded') return { ok: false }
    setImmediate(() => { beforeInstall(); autoUpdater.quitAndInstall(false, true) })
    return { ok: true }
  })
}

module.exports = { registerUpdater }
