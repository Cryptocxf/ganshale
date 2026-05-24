/** 与 src/lib/windowAppDisplay.ts 保持同步（Electron 主进程用） */

const DOC_KEYS = ['pdf', 'ppt', 'excel', 'word']

const DOC_EXT = {
  pdf: /\.pdf(\s|$| -|\)|\]|\[|，|,)/i,
  ppt: /\.pptx?(\s|$| -|\)|\]|\[|，|,)/i,
  excel: /\.(xlsx?|xls)(\s|$| -|\)|\]|\[|，|,)/i,
  word: /\.(docx?|doc)(\s|$| -|\)|\]|\[|，|,)/i,
}

function normalizeExeKey(app) {
  return String(app ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.exe$/i, '')
}

function haystack(title, appPath) {
  return `${title} ${appPath}`.toLowerCase().replace(/\\/g, '/')
}

function detectDocKind(h) {
  for (const kind of DOC_KEYS) {
    if (DOC_EXT[kind].test(h)) return kind
  }
  return null
}

/**
 * @param {string} app
 * @param {string} [title]
 * @param {string} [appPath]
 * @returns {string}
 */
function resolveForegroundIdentityKey(app, title = '', appPath = '') {
  const exe = normalizeExeKey(app)
  const h = haystack(String(title), String(appPath))

  const fromExt = detectDocKind(h)
  if (fromExt) return fromExt

  if (exe === 'winword') return 'word'
  if (exe === 'excel') return 'excel'
  if (exe === 'powerpnt') return 'ppt'
  if (exe === 'et') return 'excel'
  if (exe === 'wpp') return 'ppt'
  if (exe === 'acrobat' || exe === 'acrord32') return 'pdf'

  if (exe === 'wps' || h.includes('/office6/wps') || h.includes('kingsoft/wps')) {
    return 'wps'
  }

  if (exe === 'code' || exe === 'code-insiders' || exe === 'code - insiders') {
    return 'vscode'
  }

  return exe || 'unknown'
}

module.exports = { resolveForegroundIdentityKey, normalizeExeKey }
