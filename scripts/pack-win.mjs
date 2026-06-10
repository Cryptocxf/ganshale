/**
 * Windows 安装包：使用国内镜像，避免 electron-builder 访问 GitHub 超时。
 * 环境变量可覆盖：ELECTRON_MIRROR、ELECTRON_BUILDER_BINARIES_MIRROR
 */
import { spawnSync } from 'node:child_process'

const env = {
  ...process.env,
  ELECTRON_MIRROR:
    process.env.ELECTRON_MIRROR ?? 'https://npmmirror.com/mirrors/electron/',
  ELECTRON_BUILDER_BINARIES_MIRROR:
    process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??
    'https://npmmirror.com/mirrors/electron-builder-binaries/',
}

const r = spawnSync('npx', ['electron-builder', '--win', 'nsis'], {
  stdio: 'inherit',
  env,
  shell: true,
})

process.exit(r.status ?? 1)
