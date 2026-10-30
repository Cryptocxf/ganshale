const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.join(__dirname, '..')
if (!process.versions.electron) {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, encoding: 'utf8', windowsHide: true, timeout: 70000 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.status === 0 && !(result.stdout || '').includes('PASS: full application')) {
    console.error('Background test exited without completing assertions')
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}
const electron = require('electron')
const { app, BrowserWindow, powerMonitor, ipcMain } = electron
let trayQuitAction
const originalBuildMenu = electron.Menu.buildFromTemplate.bind(electron.Menu)
electron.Menu.buildFromTemplate = (template) => {
  trayQuitAction = template.find(item => item.label === '退出应用')?.click || trayQuitAction
  return originalBuildMenu(template)
}
let blockAcknowledgements = false
let simulatedLock = false
powerMonitor.getSystemIdleState = () => simulatedLock ? 'locked' : 'active'
const originalHandle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = (channel, listener) => originalHandle(channel, (event, ...args) => {
  if (channel === 'ganshale:ack-recorded-window-events' && blockAcknowledgements) return { ok: false }
  return listener(event, ...args)
})
const base = path.join(root, '.private')
fs.mkdirSync(base, { recursive: true })
const isolated = fs.mkdtempSync(path.join(base, 'background-e2e-'))
app.setPath('userData', isolated)
const originalGetPath = app.getPath.bind(app)
app.getPath = (name) => name === 'appData' ? isolated : originalGetPath(name)
const originalLoadURL = BrowserWindow.prototype.loadURL
BrowserWindow.prototype.loadURL = function (url, ...args) {
  return url === 'http://127.0.0.1:5180/' ? this.loadFile(path.join(root, 'dist', 'index.html')) : originalLoadURL.call(this, url, ...args)
}
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function (id, parent, ...rest) {
  if (id === './startupLog.cjs' && parent.filename.endsWith(path.join('electron', 'main.cjs'))) return { init() {}, write() {}, logFilePath: () => '' }
  return originalLoad.call(this, id, parent, ...rest)
}
require('../electron/main.cjs')
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(resolve => win.webContents.once('did-finish-load', resolve))
  await wait(3500)
  const journalFile = path.join(isolated, 'Ganshale', 'window-recording-pending.json')
  const readJournal = () => JSON.parse(fs.readFileSync(journalFile, 'utf8')).events
  win.minimize()
  blockAcknowledgements = true
  win.webContents.debugger.attach('1.3')
  await win.webContents.debugger.sendCommand('Page.setWebLifecycleState', { state: 'frozen' })
  await wait(8000)
  const hidden = readJournal()
  assert.ok(hidden.some(event => event.data.kind === 'work-session' && event.duration >= 8), 'frozen minimized renderer must not stop main-process clock')
  assert.ok(hidden.every(event => !/^ganshale(?:\.exe)?$/i.test(event.data.app)), 'self windows are excluded')
  simulatedLock = true
  powerMonitor.emit('lock-screen')
  const locked = JSON.stringify(readJournal())
  await wait(2500)
  assert.equal(JSON.stringify(readJournal()), locked, 'lock excludes all recording')
  powerMonitor.emit('suspend')
  simulatedLock = false
  powerMonitor.emit('unlock-screen')
  await wait(1500)
  assert.equal(JSON.stringify(readJournal()), locked, 'unlock alone does not cancel sleep pause')
  powerMonitor.emit('resume')
  await wait(2500)
  assert.ok(readJournal().filter(event => event.data.kind === 'work-session').length >= 2, 'resume creates a fresh session')
  await win.webContents.debugger.sendCommand('Page.setWebLifecycleState', { state: 'active' })
  blockAcknowledgements = false
  win.webContents.debugger.detach()
  win.restore()
  win.show()
  await wait(6000)
  const restored = await win.webContents.executeJavaScript(`(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('ganshale_aw'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const rows = await new Promise((resolve, reject) => { const r = db.transaction('events').objectStore('events').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    db.close();
    return { sessions: rows.filter(row => row.data.kind === 'work-session').length, windows: rows.filter(row => row.data.kind !== 'work-session').length, state: (await window.ganshaleDesktop.getRecordedWindowEvents()).state };
  })()`)
  assert.ok(restored.sessions >= 2, 'restoring UI replays main-process records into actual IndexedDB')
  assert.ok(restored.state.pending < 5, 'persisted events are acknowledged')
  blockAcknowledgements = true
  win.close()
  await wait(1800)
  assert.equal(win.isDestroyed(), false, 'X must not destroy the client')
  assert.equal(win.isVisible(), false, 'X hides directly to tray')
  assert.equal(BrowserWindow.getAllWindows().length, 1, 'X must not open a confirmation dialog')
  const sessionAtClose = readJournal().find(event => event.data.kind === 'work-session' && !event.data.closed)
  await wait(3000)
  const sessionAfterClose = readJournal().find(event => event.id === sessionAtClose.id)
  assert.ok(sessionAfterClose.duration > sessionAtClose.duration, 'close-to-tray must continue recording')
  assert.equal(typeof trayQuitAction, 'function', 'tray keeps explicit quit action')
  console.log('PASS: X hides without confirmation and continues recording; explicit app quit exits')
  console.log('PASS: full application minimized/frozen renderer, native foreground samples, lock/sleep exclusion, resume and IndexedDB replay', JSON.stringify(restored))
  trayQuitAction()
}).catch(error => { console.error(error.stack || error.message); app.exit(1) })
