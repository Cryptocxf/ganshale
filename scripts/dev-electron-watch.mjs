/**
 * 开发时启动 Electron，并在 electron/*.cjs 变更后自动重启主进程。
 * main.cjs 的 IPC 注册不会随 Vite HMR 生效，必须重启 Electron。
 */
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const electronDir = path.join(root, 'electron')

/** @type {import('node:child_process').ChildProcess | null} */
let child = null
let intentionalExit = false
let restartTimer = null

function startElectron() {
  const electronEnv = { ...process.env }
  // Some IDE/agent terminals set this for Electron-based tooling. Passing it
  // through makes electron.exe run as plain Node, so `require('electron').app`
  // is undefined and the desktop app exits before tracking can start.
  delete electronEnv.ELECTRON_RUN_AS_NODE
  child = spawn('npx', ['electron', '.'], {
    cwd: root,
    stdio: 'inherit',
    env: electronEnv,
    shell: true,
  })
  child.on('exit', (code) => {
    child = null
    if (!intentionalExit) process.exit(code ?? 0)
  })
}

function restartElectron(reason) {
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    console.log(`[dev-electron] 重启 Electron（${reason}）`)
    intentionalExit = true
    if (child && !child.killed) {
      child.kill('SIGTERM')
      setTimeout(() => {
        intentionalExit = false
        startElectron()
      }, 400)
    } else {
      intentionalExit = false
      startElectron()
    }
  }, 350)
}

watch(electronDir, { recursive: true }, (_event, filename) => {
  if (!filename || !String(filename).endsWith('.cjs')) return
  restartElectron(filename)
})

startElectron()
