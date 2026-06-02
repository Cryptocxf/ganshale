const fs = require('fs')
const path = require('path')

/** @returns {string} */
function logFilePath() {
  const base = process.env.TEMP || process.env.LOCALAPPDATA || process.cwd()
  return path.join(base, 'ganshale-startup.log')
}

/** @param {...unknown} parts */
function write(...parts) {
  const line = `[${new Date().toISOString()}] ${parts
    .map((p) => {
      if (p instanceof Error) return `${p.message}\n${p.stack ?? ''}`
      if (typeof p === 'object' && p !== null) {
        try {
          return JSON.stringify(p)
        } catch {
          return String(p)
        }
      }
      return String(p)
    })
    .join(' ')}\n`
  try {
    fs.appendFileSync(logFilePath(), line, 'utf8')
  } catch {
    /* ignore */
  }
}

function init() {
  write('--- boot ---', `execPath=${process.execPath}`, `cwd=${process.cwd()}`, `argv=${process.argv.join(' ')}`)
}

module.exports = { init, write, logFilePath }
