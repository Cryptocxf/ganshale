const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  screen,
  shell,
  dialog,
  Tray,
  nativeImage,
} = require('electron')
const path = require('path')
const fs = require('fs')
const startupLog = require('./startupLog.cjs')

startupLog.init()

/** @param {string} title @param {string} detail */
function showFatalStartupError(title, detail) {
  startupLog.write('FATAL', title, detail)
  try {
    dialog.showErrorBox(
      title,
      `${detail}\n\n若仍无法启动，请将以下日志发给开发者：\n${startupLog.logFilePath()}`,
    )
  } catch {
    /* ignore */
  }
}

process.on('uncaughtException', (err) => {
  showFatalStartupError('干啥了 启动失败', err instanceof Error ? err.message : String(err))
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  startupLog.write('unhandledRejection', reason)
})

/** 数据目录：安装目录下的 `data`（打包）；开发时在项目根 `data`。 */
function defaultUserDataPath() {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), 'data')
  }
  return path.join(app.getAppPath(), '..', 'data')
}

function fallbackUserDataPath() {
  return path.join(app.getPath('appData'), 'Ganshale')
}

/** @param {string} dir */
function canWriteDirectory(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
    const probe = path.join(dir, `.write-probe-${process.pid}`)
    fs.writeFileSync(probe, 'ok', 'utf8')
    fs.unlinkSync(probe)
    return true
  } catch {
    return false
  }
}

function applyUserDataPath() {
  const preferred = defaultUserDataPath()
  if (canWriteDirectory(preferred)) {
    app.setPath('userData', preferred)
    startupLog.write('userData', preferred)
    return
  }

  const fallback = fallbackUserDataPath()
  if (canWriteDirectory(fallback)) {
    app.setPath('userData', fallback)
    startupLog.write('userData fallback', fallback, `preferred=${preferred}`)
    return
  }

  startupLog.write('userData unavailable', preferred, fallback)
}

applyUserDataPath()

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  startupLog.write('second instance blocked')
  app.quit()
}

/** @type {BrowserWindow | null} */
let mainBrowserWindow = null
/** @type {Tray | null} */
let appTray = null
/** 用户确认退出或 before-quit 时为 true，允许窗口真正关闭 */
let isQuitting = false
/** 主窗口是否已 `show()`（启动页在可见后再计时） */
let mainWindowHasShown = false
/** @type {BrowserWindow | null} */
let reflectPromptWindow = null
let lastReflectPromptClosedAt = 0
const REFLECT_COOLDOWN_MS = 45_000

/** 上一次 poll 的前台快照（不含时间） */
let reflectPrevForeground = null
/** 当前前台片段开始时间（跨最小化连续累计） */
let reflectSegmentStartTs = 0
/** 上一 tick 主窗口是否最小化（用于从最小化恢复时仍能触发一次回顾） */
let reflectLastTickMinimized = false
/** 设置页「开启小回顾弹窗」；默认开启 */
let reflectPromptEnabled = true

function isElectronShellApp(app) {
  const a = String(app ?? '')
    .toLowerCase()
    .trim()
    .replace(/\.exe$/i, '')
  return a === 'electron'
}

function isGanshaleSelfWindow(app, title, appPath) {
  const t = String(title).toLowerCase()
  const a = String(app)
    .toLowerCase()
    .trim()
  const p = String(appPath ?? '')
    .toLowerCase()
    .replace(/\\/g, '/')
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

function isWindowsExplorerApp(app) {
  const a = String(app ?? '')
    .toLowerCase()
    .trim()
    .replace(/\.exe$/i, '')
  return a === 'explorer'
}

function sameForeground(a, b) {
  return (
    String(a.app ?? '') === String(b.app ?? '') &&
    String(a.title ?? '') === String(b.title ?? '') &&
    String(a.appPath ?? '') === String(b.appPath ?? '')
  )
}

function formatDurationZh(sec) {
  if (sec < 60) return `${Math.round(sec)} 秒`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  const rm = m % 60
  if (rm === 0) return `${h} 小时`
  return `${h} 小时 ${rm} 分钟`
}

/** @returns {{ tier: number; headline: string; subhint?: string }} */
function reflectCopyForDuration(durationSec, appLabel) {
  const label = appLabel.length > 22 ? appLabel.slice(0, 20) + '…' : appLabel
  const m = Math.round(durationSec / 60)
  if (durationSec >= 10800) {
    return {
      tier: 180,
      headline: `已经陪了「${label}」好长一段路（大约 ${m} 分钟）——先夸夸自己。若用两三行话，你会怎么温柔地概括刚才这段专注时光？`,
      subhint: '告诉我，方便生成更准确的日报哦！（不想写也可以直接跳过～）',
    }
  }
  if (durationSec >= 3600) {
    return {
      tier: 60,
      headline: `整整一小时左右都泡在「${label}」里，眼睛和肩膀都辛苦啦～用一句话说说：这一小时的主线任务是什么呀？`,
      subhint: '告诉我，方便生成更准确的日报哦！',
    }
  }
  if (durationSec >= 1800) {
    return {
      tier: 30,
      headline: `刚才差不多半小时都给了「${label}」呢～犒赏式提问：这段时光里，你最想记下的一笔是什么？`,
      subhint: '告诉我，方便生成更准确的日报哦！',
    }
  }
  return {
    tier: 10,
    headline: `好啦，悄悄问一下～刚才大约 ${m} 分钟里，你在「${label}」里主要在忙什么呀？`,
    subhint: '告诉我，方便生成更准确的日报哦！',
  }
}

function closeReflectPromptWindow() {
  if (reflectPromptWindow && !reflectPromptWindow.isDestroyed()) {
    reflectPromptWindow.close()
  }
  reflectPromptWindow = null
}

/** 将「小回顾」窗口放到当前主显示器工作区右下角（留出边距） */
function placeReflectPromptBottomRight(win) {
  if (!win || win.isDestroyed()) return
  const [winW, winH] = win.getSize()
  const { workArea } = screen.getPrimaryDisplay()
  const margin = 16
  const x = Math.round(workArea.x + workArea.width - winW - margin)
  const y = Math.round(workArea.y + workArea.height - winH - margin)
  win.setPosition(
    Math.max(workArea.x, x),
    Math.max(workArea.y, y),
  )
}

/**
 * @param {import('electron').BrowserWindow | null} mainWin
 * @param {{ app: string; title: string; appPath?: string }} endedSession
 * @param {number} durationSec
 */
function openReflectPrompt(mainWin, endedSession, durationSec) {
  if (!mainWin || mainWin.isDestroyed()) return
  if (reflectPromptWindow && !reflectPromptWindow.isDestroyed()) return
  const now = Date.now()
  if (now - lastReflectPromptClosedAt < REFLECT_COOLDOWN_MS) return

  const appLabel = endedSession.app.replace(/\.exe$/i, '') || '这个应用'
  const { tier, headline, subhint } = reflectCopyForDuration(durationSec, appLabel)

  const htmlPath = path.join(__dirname, 'reflect-prompt.html')
  if (!fs.existsSync(htmlPath)) {
    console.warn('[ganshale] reflect-prompt.html missing:', htmlPath)
    return
  }

  const w = new BrowserWindow({
    width: 460,
    height: 420,
    minWidth: 380,
    minHeight: 360,
    show: false,
    title: '干啥了 · 小回顾',
    parent: undefined,
    modal: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    icon: resolveAppIconPath(),
    backgroundColor: '#faf8ff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'reflect-preload.cjs'),
    },
  })

  reflectPromptWindow = w
  w.once('closed', () => {
    lastReflectPromptClosedAt = Date.now()
    reflectPromptWindow = null
  })

  void w.loadFile(htmlPath).then(() => {
    const meta = {
      tier,
      durationSec,
      durationLabel: formatDurationZh(durationSec),
      app: endedSession.app,
      title: endedSession.title,
      appPath: endedSession.appPath,
      headline,
      subhint,
      endedAt: new Date().toISOString(),
    }
    w.webContents.send('reflect-init', meta)
    placeReflectPromptBottomRight(w)
    w.show()
    w.focus()
  })
}

/**
 * 前台窗口切换时：若本段在前台停留 ≥10 分钟，且（当前最小化 或 上一 tick 最小化），则弹出温柔回顾。
 * 时长从「成为该前台」起算，避免「先用了很久再最小化」被少算。
 * @param {import('electron').BrowserWindow | null} mainWin
 * @param {{ app: string; title: string; capturedAt: string; appPath?: string }} mapped
 * @param {number} now
 */
function handleReflectFocusTransition(mainWin, mapped, now) {
  if (!mainWin || mainWin.isDestroyed() || !mapped) return
  const minimized = mainWin.isMinimized()

  if (!reflectPrevForeground) {
    reflectPrevForeground = { app: mapped.app, title: mapped.title, appPath: mapped.appPath }
    reflectSegmentStartTs = now
    reflectLastTickMinimized = minimized
    return
  }

  if (sameForeground(reflectPrevForeground, mapped)) {
    reflectLastTickMinimized = minimized
    return
  }

  const durationSec = Math.max(0, Math.round((now - reflectSegmentStartTs) / 1000))
  const ended = { ...reflectPrevForeground }
  const shouldAsk =
    durationSec >= 600 &&
    !isGanshaleSelfWindow(ended.app, ended.title, ended.appPath) &&
    !isWindowsExplorerApp(ended.app) &&
    (minimized || reflectLastTickMinimized)

  if (shouldAsk && reflectPromptEnabled) {
    openReflectPrompt(mainWin, ended, durationSec)
  }

  reflectPrevForeground = { app: mapped.app, title: mapped.title, appPath: mapped.appPath }
  reflectSegmentStartTs = now
  reflectLastTickMinimized = minimized
}

ipcMain.handle('ganshale:set-reflect-prompt-enabled', (_event, enabled) => {
  reflectPromptEnabled = enabled !== false
  if (!reflectPromptEnabled) closeReflectPromptWindow()
  return { ok: true }
})

ipcMain.handle('reflect-prompt:submit', (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win !== reflectPromptWindow) return { ok: false }
  const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}
  if (mainBrowserWindow && !mainBrowserWindow.isDestroyed()) {
    mainBrowserWindow.webContents.send('ganshale:session-reflection', {
      ...meta,
      text,
      savedAt: new Date().toISOString(),
    })
  }
  closeReflectPromptWindow()
  return { ok: true }
})

ipcMain.handle('reflect-prompt:skip', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win !== reflectPromptWindow) return { ok: false }
  closeReflectPromptWindow()
  return { ok: true }
})

/** @type {BrowserWindow | null} */
let todoReminderWindow = null

function closeTodoReminderWindow() {
  if (todoReminderWindow && !todoReminderWindow.isDestroyed()) {
    todoReminderWindow.close()
  }
  todoReminderWindow = null
}

/**
 * @param {{ title?: string; body?: string; priority?: number; todoId?: string }} payload
 */
function openTodoReminder(payload) {
  const title = String(payload?.title ?? '').trim() || '待办提醒'
  const body = String(payload?.body ?? '').trim()
  const priority = Math.min(5, Math.max(1, Number(payload?.priority) || 1))

  const htmlPath = path.join(__dirname, 'todo-reminder.html')
  if (!fs.existsSync(htmlPath)) {
    console.warn('[ganshale] todo-reminder.html missing:', htmlPath)
    return { ok: false }
  }

  if (todoReminderWindow && !todoReminderWindow.isDestroyed()) {
    todoReminderWindow.close()
    todoReminderWindow = null
  }

  const w = new BrowserWindow({
    width: 380,
    height: 210,
    minWidth: 320,
    minHeight: 180,
    show: false,
    title: '干啥了 · 待办提醒',
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: false,
    icon: resolveAppIconPath(),
    backgroundColor: '#fff9f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'todo-reminder-preload.cjs'),
    },
  })

  todoReminderWindow = w
  w.once('closed', () => {
    todoReminderWindow = null
  })

  void w.loadFile(htmlPath).then(() => {
    w.webContents.send('todo-reminder:init', { title, body, priority })
    placeReflectPromptBottomRight(w)
    w.show()
    w.focus()
  })

  return { ok: true }
}

ipcMain.handle('ganshale:show-todo-reminder', (_event, payload) => {
  try {
    return openTodoReminder(payload && typeof payload === 'object' ? payload : {})
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

ipcMain.handle('todo-reminder:dismiss', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || win !== todoReminderWindow) return { ok: false }
  closeTodoReminderWindow()
  return { ok: true }
})

/** @type {Map<string, string>} pathLower → data URL */
const fileIconCache = new Map()
const FILE_ICON_CACHE_MAX = 400

const isDev = !app.isPackaged

function resolveAppIconPath() {
  const rel = isDev
    ? path.join(__dirname, '..', 'public', 'ganshale-logo-app.png')
    : path.join(__dirname, '..', 'dist', 'ganshale-logo-app.png')
  return fs.existsSync(rel) ? rel : undefined
}

function showMainWindow() {
  const win = mainBrowserWindow
  if (!win || win.isDestroyed()) {
    createWindow()
    return
  }
  if (win.isMinimized()) win.restore()
  if (process.platform === 'win32') win.setSkipTaskbar(false)
  win.show()
  win.focus()
}

function destroyAppTray() {
  if (appTray && !appTray.isDestroyed()) {
    appTray.destroy()
  }
  appTray = null
}

function ensureAppTray() {
  if (appTray && !appTray.isDestroyed()) return appTray
  const iconPath = resolveAppIconPath()
  if (!iconPath) return null
  const image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) return null
  const trayImage =
    process.platform === 'win32' ? image.resize({ width: 16, height: 16 }) : image
  appTray = new Tray(trayImage)
  appTray.setToolTip('干啥了')
  const menu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  appTray.setContextMenu(menu)
  appTray.on('double-click', () => showMainWindow())
  return appTray
}

/** @returns {'tray' | 'quit' | 'cancel'} */
function promptCloseMainWindow(win) {
  const choice = dialog.showMessageBoxSync(win, {
    type: 'question',
    buttons: ['最小化到托盘', '退出应用', '取消'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
    title: '干啥了',
    message: '要关闭窗口吗？',
    detail:
      '选择「最小化到托盘」可继续在后台记录窗口使用情况；选择「退出应用」将完全退出。',
  })
  if (choice === 0) return 'tray'
  if (choice === 1) return 'quit'
  return 'cancel'
}

/** @type {((opts?: object) => Promise<object | undefined>) | null | undefined} undefined = not loaded yet */
let activeWinCache

async function getActiveWin() {
  if (activeWinCache !== undefined) return activeWinCache
  try {
    const m = await import('active-win')
    const fn = m.default ?? m
    activeWinCache = typeof fn === 'function' ? fn : null
  } catch (e) {
    console.warn('[ganshale] active-win import failed:', e.message)
    activeWinCache = null
  }
  return activeWinCache
}

const POLL_MS = 1200

let trackingTimer = null
/** @type {import('electron').WebContents | null} */
let trackingWebContents = null
/** @type {string | null} */
let trackingPrevForegroundKey = null
let trackingSegmentStartTs = 0

function stopWindowTracking() {
  if (trackingTimer) {
    clearInterval(trackingTimer)
    trackingTimer = null
  }
  trackingWebContents = null
  trackingPrevForegroundKey = null
  trackingSegmentStartTs = 0
  reflectPrevForeground = null
  reflectSegmentStartTs = Date.now()
  reflectLastTickMinimized = false
}

function trackingWebContentsAlive() {
  const wc = trackingWebContents
  return Boolean(wc && !wc.isDestroyed() && !wc.isLoading())
}

/** 安全发送前台窗口事件；页面重载/HMR 导致 frame 销毁时返回 false 并停止轮询。 */
function trackingSendForeground(payload) {
  if (!trackingWebContentsAlive()) {
    stopWindowTracking()
    return false
  }
  try {
    trackingWebContents.send('ganshale:foreground-window', payload)
    return true
  } catch (err) {
    console.warn('[ganshale] foreground send failed:', err instanceof Error ? err.message : err)
    stopWindowTracking()
    return false
  }
}

async function trackingPoll() {
  if (!trackingWebContentsAlive()) {
    stopWindowTracking()
    return
  }
  const fn = await getActiveWin()
  if (!trackingWebContentsAlive()) {
    stopWindowTracking()
    return
  }
  if (!fn) return
  try {
    const raw = await fn()
    if (!trackingWebContentsAlive()) {
      stopWindowTracking()
      return
    }
    if (!raw) {
      trackingPrevForegroundKey = null
      trackingSendForeground(null)
      return
    }
    const mapped = mapForeground(raw)
    if (!mapped) {
      trackingPrevForegroundKey = null
      trackingSendForeground(null)
      return
    }
    const key = trackingForegroundKey(mapped)
    const now = Date.now()
    if (key !== trackingPrevForegroundKey) {
      trackingPrevForegroundKey = key
      trackingSegmentStartTs = now
    }
    mapped.segmentStartedAt = new Date(trackingSegmentStartTs).toISOString()
    if (!trackingSendForeground(mapped)) return
    handleReflectFocusTransition(mainBrowserWindow, mapped, now)
  } catch (err) {
    console.error('[ganshale] active-win poll:', err)
  }
}

function startTrackingPollTimer() {
  if (trackingTimer) return
  if (!trackingWebContentsAlive()) return
  trackingTimer = setInterval(() => void trackingPoll(), POLL_MS)
}

const { resolveForegroundIdentityKey } = require('./windowAppDisplay.cjs')

/** @param {{ app: string; title?: string; appPath?: string }} mapped */
function trackingForegroundKey(mapped) {
  return resolveForegroundIdentityKey(
    mapped.app,
    mapped.title ?? '',
    mapped.appPath ?? '',
  )
}

/**
 * @param {object | undefined} result
 * @returns {{ app: string; title: string; capturedAt: string; appPath?: string } | null}
 */
function mapForeground(result) {
  if (!result) return null
  const title = typeof result.title === 'string' ? result.title : ''
  let appName = ''
  let appPath = ''
  const owner = result.owner
  if (owner && typeof owner === 'object') {
    if (typeof owner.path === 'string' && owner.path) {
      appPath = owner.path
    }
    if (process.platform === 'win32' && owner.path) {
      appName = path.basename(String(owner.path))
    } else if (owner.name) {
      appName = String(owner.name)
    }
  }
  if (!appName) appName = 'unknown'
  const out = {
    app: appName,
    title,
    capturedAt: new Date().toISOString(),
  }
  if (appPath) out.appPath = appPath
  return out
}

ipcMain.handle('ganshale:was-main-window-shown', () => mainWindowHasShown)

ipcMain.handle('ganshale:window-tracking-supported', async () => {
  const fn = await getActiveWin()
  return { supported: Boolean(fn), platform: process.platform }
})

/**
 * 将进程名或路径解析为可读取图标的绝对路径（Windows System32 等）。
 * @param {string} filePathOrExe
 * @returns {string | null}
 */
function resolveIconFilePath(filePathOrExe) {
  const raw = String(filePathOrExe ?? '').trim()
  if (!raw) return null

  if (fs.existsSync(raw)) return raw

  if (process.platform !== 'win32') return null

  const base = path.basename(raw.replace(/[/\\]+/g, path.sep))
  if (!/\.exe$/i.test(base)) return null

  const systemRoot = process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows'
  const candidates = [
    path.join(systemRoot, 'System32', base),
    path.join(systemRoot, 'SysWOW64', base),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/**
 * 系统文件图标（Windows 等对 .exe 有效），返回 PNG data URL；失败返回 null。
 * 支持仅传 `notepad.exe` 等进程名（自动解析 System32 路径）。
 * @param {unknown} filePath
 * @returns {Promise<string | null>}
 */
ipcMain.handle('ganshale:get-file-icon', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !filePath.trim()) return null
  const resolved = resolveIconFilePath(filePath.trim())
  if (!resolved) return null
  const key = resolved.toLowerCase()
  const hit = fileIconCache.get(key)
  if (hit) return hit
  try {
    const img = await app.getFileIcon(resolved, { size: 'normal' })
    if (!img || img.isEmpty()) return null
    const png = img.toPNG()
    if (!png || png.length === 0) return null
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`
    if (fileIconCache.size >= FILE_ICON_CACHE_MAX) fileIconCache.clear()
    fileIconCache.set(key, dataUrl)
    return dataUrl
  } catch {
    return null
  }
})

ipcMain.handle('ganshale:start-window-tracking', async (event) => {
  const activeWin = await getActiveWin()
  if (!activeWin) {
    return { ok: false, error: 'active-win 未安装或加载失败，请执行 npm install' }
  }
  stopWindowTracking()
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { ok: false, error: 'no-browser-window' }
  mainBrowserWindow = win
  trackingWebContents = win.webContents
  startTrackingPollTimer()

  return { ok: true, intervalMs: POLL_MS }
})

ipcMain.handle('ganshale:stop-window-tracking', () => {
  stopWindowTracking()
  return { ok: true }
})

/**
 * macOS / Linux：按关键词搜索应用路径（.app / PATH 下可执行文件）。
 * @param {string} safeQuery 已剥离 shell 元字符
 * @returns {Promise<{ name: string; path?: string }[]>}
 */
async function searchLocalAppsUnix(safeQuery) {
  const { execFile } = require('child_process')
  const { promisify } = require('util')
  const execFileAsync = promisify(execFile)
  const env = { ...process.env, GANSHALE_APP_QUERY: safeQuery }
  const isMac = process.platform === 'darwin'
  const script = isMac
    ? 'Q=$(printf %s "$GANSHALE_APP_QUERY"); find /Applications /System/Applications "$HOME/Applications" -maxdepth 4 -iname "*.app" 2>/dev/null | grep -Fi "$Q" | head -60'
    : 'Q=$(printf %s "$GANSHALE_APP_QUERY"); { find /usr/bin /bin /usr/local/bin "$HOME/.local/bin" -maxdepth 1 -type f -iname "*${Q}*" 2>/dev/null; command -v -- "$Q" 2>/dev/null; } | sort -u | head -60'
  const { stdout } = await execFileAsync('/bin/bash', ['-lc', script], {
    env,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 25_000,
  })
  const lines = String(stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  /** @type {{ name: string; path?: string }[]} */
  const hits = []
  const seen = new Set()
  for (const line of lines) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({ name: path.basename(line), path: line })
    if (hits.length >= 80) break
  }
  return hits
}

/**
 * 按关键词搜索本机应用（Windows：注册表 App Paths、PATH、运行中进程、LocalAppData\\Programs 等）。
 * @param {unknown} query
 * @returns {Promise<{ ok: boolean; hits?: { name: string; path?: string }[]; error?: string }>}
 */
ipcMain.handle('ganshale:search-local-apps', async (_event, query) => {
  const raw = typeof query === 'string' ? query.trim() : ''
  if (raw.length < 1) {
    return { ok: false, error: '请输入关键词（如 openclaw）', hits: [] }
  }
  if (raw.length > 96) {
    return { ok: false, error: '关键词过长（≤96 字符）', hits: [] }
  }
  const safeUnix = raw.replace(/['"`$\\;|&<>\n\r]/g, '').trim()
  if (process.platform === 'win32') {
    const { execFile } = require('child_process')
    const { promisify } = require('util')
    const execFileAsync = promisify(execFile)
    const bundled = path.join(__dirname, 'search-local-apps.ps1')
    if (!fs.existsSync(bundled)) {
      return { ok: false, error: 'search-local-apps.ps1 缺失', hits: [] }
    }
    const b64 = Buffer.from(raw, 'utf8').toString('base64')
    /** @type {string | null} */
    let tmpScript = null
    try {
      const ps1 = fs.readFileSync(bundled, 'utf8')
      tmpScript = path.join(
        app.getPath('temp'),
        `ganshale-search-local-apps-${process.pid}-${Date.now()}.ps1`,
      )
      fs.writeFileSync(tmpScript, ps1, 'utf8')
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          tmpScript,
          '-QueryBase64',
          b64,
        ],
        { maxBuffer: 12 * 1024 * 1024, windowsHide: true, timeout: 55_000 },
      )
      const parsed = JSON.parse((stdout || '').trim() || '[]')
      const arr = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
      const hits = arr
        .filter((h) => h && typeof h.name === 'string' && /\.exe$/i.test(String(h.name)))
        .map((h) => ({
          name: String(h.name),
          path: typeof h.path === 'string' && h.path.trim() ? h.path.trim() : undefined,
        }))
      return { ok: true, hits }
    } catch (err) {
      console.error('[ganshale] search-local-apps', err)
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        hits: [],
      }
    } finally {
      if (tmpScript) {
        try {
          fs.unlinkSync(tmpScript)
        } catch {
          /* ignore */
        }
      }
    }
  }
  if (process.platform === 'darwin' || process.platform === 'linux') {
    if (!safeUnix) {
      return { ok: false, error: '关键词无效', hits: [] }
    }
    try {
      const hits = await searchLocalAppsUnix(safeUnix)
      return { ok: true, hits }
    } catch (err) {
      console.error('[ganshale] search-local-apps unix', err)
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        hits: [],
      }
    }
  }
  return { ok: true, hits: [] }
})

function parseExeFromDisplayIcon(icon) {
  if (!icon || typeof icon !== 'string') return null
  const t = icon.trim()
  const part = t.split(/[,;]/)[0].trim().replace(/^['"]+|['"]+$/g, '')
  if (/\.exe$/i.test(part)) return part
  const m = t.match(/([^"';\s]+\.exe)/i)
  return m ? m[1] : null
}

function parseExeFromUninstallString(s) {
  if (!s || typeof s !== 'string') return null
  const q = s.match(/"([^"]+\.exe)"/i)
  if (q) return q[1]
  const m = s.match(/([a-zA-Z]:[^:\s"]+\.exe)/i)
  return m ? m[1].trim() : null
}

/**
 * @param {unknown[]} rawList
 * @returns {{ displayName: string; patternHint: string; exePath?: string; iconPath?: string }[]}
 */
function normalizeInstalledAppsFromRegistry(rawList) {
  if (!Array.isArray(rawList)) return []
  /** @type {{ displayName: string; patternHint: string; exePath?: string; iconPath?: string }[]} */
  const items = []
  const seen = new Set()
  for (const row of rawList) {
    if (!row || typeof row !== 'object') continue
    const displayName = typeof row.displayName === 'string' ? row.displayName.trim() : ''
    if (!displayName) continue
    const displayIcon = typeof row.displayIcon === 'string' ? row.displayIcon : ''
    const uninstallString = typeof row.uninstallString === 'string' ? row.uninstallString : ''
    let exePath = parseExeFromDisplayIcon(displayIcon) || parseExeFromUninstallString(uninstallString)
    if (exePath && !/\.exe$/i.test(exePath)) exePath = null
    let patternHint = ''
    if (exePath) {
      patternHint = path.basename(exePath).replace(/\.exe$/i, '')
    } else {
      patternHint = displayName.split(/[|–—]/)[0].trim().slice(0, 48)
    }
    if (!patternHint) patternHint = displayName.slice(0, 48)
    const dedupeKey = displayName.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    let iconPath = exePath
    if (!iconPath && displayIcon) {
      const p = displayIcon.split(/[,;]/)[0].trim().replace(/^['"]+|['"]+$/g, '')
      if (/\.(ico|dll|exe)$/i.test(p)) iconPath = p
    }
    items.push({
      displayName,
      patternHint,
      exePath: exePath || undefined,
      iconPath: iconPath || undefined,
    })
  }
  return items
}

ipcMain.handle('ganshale:list-installed-apps', async () => {
  if (process.platform !== 'win32') {
    return { ok: true, items: [] }
  }
  const { execFile } = require('child_process')
  const { promisify } = require('util')
  const execFileAsync = promisify(execFile)
  const bundled = path.join(__dirname, 'list-installed-apps.ps1')
  if (!fs.existsSync(bundled)) {
    return { ok: false, error: 'list-installed-apps.ps1 缺失', items: [] }
  }
  /** @type {string | null} */
  let tmpScript = null
  try {
    const ps1 = fs.readFileSync(bundled, 'utf8')
    tmpScript = path.join(
      app.getPath('temp'),
      `ganshale-list-installed-apps-${process.pid}-${Date.now()}.ps1`,
    )
    fs.writeFileSync(tmpScript, ps1, 'utf8')
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpScript],
      { maxBuffer: 24 * 1024 * 1024, windowsHide: true, timeout: 90_000 },
    )
    const parsed = JSON.parse((stdout || '').trim() || '[]')
    const arr = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
    const items = normalizeInstalledAppsFromRegistry(arr)
    return { ok: true, items }
  } catch (err) {
    console.error('[ganshale] list-installed-apps', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      items: [],
    }
  } finally {
    if (tmpScript) {
      try {
        fs.unlinkSync(tmpScript)
      } catch {
        /* ignore */
      }
    }
  }
})

ipcMain.handle('ganshale:open-installed-apps-settings', async () => {
  try {
    if (process.platform === 'win32') {
      await shell.openExternal('ms-settings:appsfeatures')
    } else if (process.platform === 'darwin') {
      await shell.openPath('/Applications')
    } else {
      const { execFile } = require('child_process')
      const { promisify } = require('util')
      await promisify(execFile)('xdg-open', ['/usr/share/applications'], {
        timeout: 8000,
        windowsHide: true,
      }).catch(() => {})
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

ipcMain.handle('ganshale:get-download-path', async () => {
  try {
    return { ok: true, path: app.getPath('downloads') }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

ipcMain.handle('ganshale:get-storage-path', async () => {
  try {
    return {
      ok: true,
      path: app.getPath('userData'),
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

ipcMain.handle('ganshale:open-path-in-folder', async (_event, targetPath) => {
  try {
    const p = String(targetPath ?? '').trim()
    if (!p) return { ok: false, error: '路径为空' }
    const errMsg = await shell.openPath(p)
    if (errMsg) return { ok: false, error: errMsg }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

/**
 * 将日报/周报/月报 Markdown 写入 Obsidian Vault（自动创建子目录）。
 * @param {{ vaultPath?: string; relativePath?: string; content?: string }} payload
 */
ipcMain.handle('ganshale:write-obsidian-report', async (_event, payload) => {
  try {
    const vaultPath = String(payload?.vaultPath ?? '').trim()
    const relativePath = String(payload?.relativePath ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
    const content = String(payload?.content ?? '')
    if (!vaultPath) return { ok: false, error: 'Vault 路径为空' }
    if (!relativePath) return { ok: false, error: '相对路径为空' }
    if (!content.trim()) return { ok: false, error: '报告内容为空' }
    if (relativePath.includes('..')) return { ok: false, error: '非法相对路径' }

    const vaultResolved = path.resolve(vaultPath)
    const filePath = path.resolve(vaultResolved, ...relativePath.split('/'))
    const vaultNorm = vaultResolved.toLowerCase()
    const fileNorm = filePath.toLowerCase()
    if (fileNorm !== vaultNorm && !fileNorm.startsWith(`${vaultNorm}${path.sep}`)) {
      return { ok: false, error: '目标路径超出 Vault 范围' }
    }

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, content, 'utf8')
    return { ok: true, filePath }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

function createWindow() {
  mainWindowHasShown = false
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 1120,
    minHeight: 760,
    show: false,
    title: '干啥了',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: resolveAppIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      /** 托盘隐藏时仍按时处理前台窗口 IPC 与心跳 */
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainBrowserWindow = win
  const contents = win.webContents

  win.on('close', (e) => {
    closeReflectPromptWindow()
    if (isQuitting) {
      if (trackingWebContents === contents) stopWindowTracking()
      return
    }
    e.preventDefault()

    const action = promptCloseMainWindow(win)
    if (action === 'tray') {
      ensureAppTray()
      if (process.platform === 'win32') win.setSkipTaskbar(true)
      win.hide()
      return
    }
    if (action === 'quit') {
      isQuitting = true
      if (trackingWebContents === contents) stopWindowTracking()
      app.quit()
    }
  })

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return
    mainWindowHasShown = true
    win.show()
    if (!contents.isDestroyed()) {
      contents.send('ganshale:main-window-shown')
    }
  })

  contents.on('did-start-navigation', () => {
    if (trackingWebContents === contents) stopWindowTracking()
  })

  contents.on('destroyed', () => {
    if (trackingWebContents === contents) stopWindowTracking()
  })

  contents.on('render-process-gone', () => {
    if (trackingWebContents === contents) stopWindowTracking()
  })

  contents.on('did-fail-load', (_e, code, desc, url) => {
    startupLog.write('did-fail-load', code, desc, url)
    if (win.isDestroyed()) return
    if (!win.isVisible()) win.show()
    if (!isDev) {
      showFatalStartupError(
        '干啥了 界面加载失败',
        `错误 ${code}：${desc}\n${url ?? ''}\n请尝试重新安装，或检查杀毒软件是否拦截了安装目录。`,
      )
    } else {
      console.error('[ganshale] failed to load dev URL', code, desc)
    }
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5180/')
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    if (!fs.existsSync(indexHtml)) {
      startupLog.write('missing index.html', indexHtml)
      showFatalStartupError(
        '干啥了 缺少程序文件',
        `找不到界面文件：\n${indexHtml}\n\n安装可能不完整，请卸载后重新安装。`,
      )
      return
    }
    void win.loadFile(indexHtml).catch((err) => {
      startupLog.write('loadFile rejected', err)
      showFatalStartupError(
        '干啥了 界面加载失败',
        err instanceof Error ? err.message : String(err),
      )
    })
  }

  win.on('closed', () => {
    if (mainBrowserWindow === win) mainBrowserWindow = null
  })
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    showMainWindow()
  })

  app.whenReady().then(() => {
    startupLog.write('app ready')
    if (process.platform !== 'darwin') {
      Menu.setApplicationMenu(null)
    }
    createWindow()
    ensureAppTray()
    app.on('activate', () => {
      if (mainBrowserWindow && !mainBrowserWindow.isDestroyed()) {
        showMainWindow()
        return
      }
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  }).catch((err) => {
    showFatalStartupError(
      '干啥了 启动失败',
      err instanceof Error ? err.message : String(err),
    )
    app.quit()
  })
}

app.on('window-all-closed', () => {
  if (!isQuitting) return
  stopWindowTracking()
  destroyAppTray()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
  stopWindowTracking()
  destroyAppTray()
})
