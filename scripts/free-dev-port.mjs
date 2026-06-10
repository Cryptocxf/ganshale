import { execSync } from 'node:child_process'

const port = Number(process.env.GANSHALE_DEV_PORT ?? 5180)

function freePortOnWindows(targetPort) {
  try {
    const out = execSync(`netstat -ano | findstr ":${targetPort}"`, { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      const match = line.match(/LISTENING\s+(\d+)\s*$/)
      if (match) pids.add(match[1])
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`[ganshale] freed dev port ${targetPort} (pid ${pid})`)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* port not in use */
  }
}

if (process.platform === 'win32') {
  freePortOnWindows(port)
}
