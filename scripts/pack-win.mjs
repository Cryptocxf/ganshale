/**
 * Windows 安装包：使用国内镜像，避免 electron-builder 访问 GitHub 超时。
 * 环境变量可覆盖：ELECTRON_MIRROR、ELECTRON_BUILDER_BINARIES_MIRROR
 *
 * 图标：须保持 win.signExecutable=false（跳过签名），勿设 signAndEditExecutable=false，
 * 否则 exe / 快捷方式会退回 Electron 默认图标，与应用内 ganshale-logo-app.png 不一致。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseDir = path.join(root, 'release')
const DEV_PORT = Number(process.env.GANSHALE_DEV_PORT ?? 5180)

const env = {
  ...process.env,
  ELECTRON_MIRROR:
    process.env.ELECTRON_MIRROR ?? 'https://npmmirror.com/mirrors/electron/',
  ELECTRON_BUILDER_BINARIES_MIRROR:
    process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??
    'https://npmmirror.com/mirrors/electron-builder-binaries/',
}

function sleep(ms) {
  spawnSync(
    'powershell',
    ['-NoProfile', '-Command', `Start-Sleep -Milliseconds ${Math.max(0, ms)}`],
    { stdio: 'ignore' },
  )
}

/** 结束可能占用 release\\win-unpacked 的「干啥了」安装版进程 */
function stopPackagedAppProcesses() {
  if (process.platform !== 'win32') return
  const ps = [
    `$p = '${releaseDir.replace(/\\/g, '\\\\')}'`,
    `Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |`,
    `Where-Object { $_.ExecutablePath -and $_.ExecutablePath -like ($p + '*') } |`,
    `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
    `Get-Process -Name 'Ganshale' -ErrorAction SilentlyContinue |`,
    `Stop-Process -Force -ErrorAction SilentlyContinue`,
  ].join(' ')
  spawnSync('powershell', ['-NoProfile', '-Command', ps], {
    stdio: 'ignore',
    shell: false,
  })
}

function removeDirIfExists(dir, label) {
  if (!fs.existsSync(dir)) return true
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
      return true
    } catch (err) {
      if (attempt === 6) {
        console.error(
          `[pack-win] 无法删除 ${label}：${err instanceof Error ? err.message : err}`,
        )
        console.error(
          '[pack-win] 请先完全退出「干啥了」安装版，关闭资源管理器中打开的 release 文件夹，再重试 npm run pack。',
        )
        return false
      }
      stopPackagedAppProcesses()
      sleep(400 * attempt)
    }
  }
  return false
}

/** Vite dev 与 electron-builder 同时写 release/ 会触发 EPERM rename */
function assertDevServerStopped() {
  if (process.platform !== 'win32') return
  let out = ''
  try {
    out = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true }).stdout ?? ''
  } catch {
    return
  }
  const listening = out
    .split(/\r?\n/)
    .some((line) => line.includes('LISTENING') && line.includes(`:${DEV_PORT}`))
  if (!listening) return
  console.error(
    `[pack-win] 检测到开发服务仍在监听端口 ${DEV_PORT}（pnpm dev 未关闭）。`,
  )
  console.error(
    '[pack-win] 请先停止 pnpm dev 再打包；否则 Vite 会锁定 release\\win-unpacked，导致 EPERM。',
  )
  process.exit(1)
}

function prepareReleaseOutput() {
  assertDevServerStopped()
  stopPackagedAppProcesses()
  sleep(300)
  const ok =
    removeDirIfExists(path.join(releaseDir, 'win-unpacked.tmp'), 'win-unpacked.tmp') &&
    removeDirIfExists(path.join(releaseDir, 'win-unpacked'), 'win-unpacked')
  if (!ok) process.exit(1)
}

prepareReleaseOutput()

const r = spawnSync('npx', ['electron-builder', '--win', 'nsis'], {
  stdio: 'inherit',
  env,
  shell: true,
  cwd: root,
})

process.exit(r.status ?? 1)
