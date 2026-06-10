import { APP_DISPLAY_NAME } from '../constants/brand'
import { getAppDisplayNameOverride } from './appDisplayNameStore'
import { normalizeWindowAppKey } from './windowForegroundMatch'

export type WindowAppIdentity = {
  /** 界面展示名（时间分布、应用时长等） */
  displayName: string
  /** 统计分色、前台分段键 */
  identityKey: string
  /** 原始进程名（含 .exe） */
  processApp: string
}

/** 按文档类型匹配图标与配色（与 {@link appBrandIcons} 一致） */
export const DOC_TYPE_IDENTITY_KEYS = ['word', 'excel', 'ppt', 'pdf'] as const
export type DocTypeIdentityKey = (typeof DOC_TYPE_IDENTITY_KEYS)[number]

const DOC_DISPLAY: Record<DocTypeIdentityKey, string> = {
  word: 'Word',
  excel: 'Excel',
  ppt: 'PPT',
  pdf: 'PDF',
}

/** 常见 Windows 系统应用：进程名 → 中文展示名 */
const SYSTEM_APP_DISPLAY: Record<string, string> = {
  notepad: '记事本',
  weixin: '微信',
  youdaodict: '有道翻译',
  wemeetapp: '腾讯会议',
  baidunetdisk: '百度网盘',
  mspaint: '画图',
  calc: '计算器',
  snippingtool: '截图工具',
  cmd: '命令提示符',
  pwsh: 'PowerShell',
  windowsterminal: '终端',
  wt: '终端',
  explorer: '资源管理器',
}

/**
 * 进程名别名：统一展示名与 identityKey（合并统计、避免 Unite 等新壳进程名露出）。
 */
const APP_IDENTITY_ALIASES: Record<string, { displayName: string; identityKey: string }> = {
  baidunetdiskunite: { displayName: '百度网盘', identityKey: 'baidunetdisk' },
  'chuanyun-view': { displayName: '移动云电脑', identityKey: 'chuanyun' },
  openclaw: { displayName: 'OpenClaw', identityKey: 'openclaw' },
  moa: { displayName: '移动办公', identityKey: 'moa' },
  emobile: { displayName: '移动办公', identityKey: 'emobile' },
  mobileoffice: { displayName: '移动办公', identityKey: 'emobile' },
  claude: { displayName: 'Claude', identityKey: 'claude' },
  sdpclient: { displayName: 'SDP', identityKey: 'sdpclient' },
}

function isGanshaleAppIdentity(exe: string, title: string, appPath: string): boolean {
  if (exe === 'ganshale') return true
  if (exe !== 'electron') return false
  const h = haystack(title, appPath)
  return h.includes('ganshale') || h.includes('干啥了')
}

/** 窗口标题 / 路径中的扩展名（优先于进程名） */
const DOC_EXT: Record<DocTypeIdentityKey, RegExp> = {
  pdf: /\.pdf(\s|$| -|—|\)|\]|\[|，|,)/i,
  ppt: /\.pptx?(\s|$| -|—|\)|\]|\[|，|,)/i,
  excel: /\.(xlsx?|xls)(\s|$| -|—|\)|\]|\[|，|,)/i,
  word: /\.(docx?|doc)(\s|$| -|—|\)|\]|\[|，|,)/i,
}

function haystack(title: string, appPath: string): string {
  return `${title} ${appPath}`.toLowerCase().replace(/\\/g, '/')
}

function detectDocKind(h: string): DocTypeIdentityKey | null {
  for (const kind of DOC_TYPE_IDENTITY_KEYS) {
    if (DOC_EXT[kind].test(h)) return kind
  }
  return null
}

/** WPS 窗口标题格式更宽松：匹配 WPS 标签页中的文档类型标识 */
function detectDocKindWps(h: string): DocTypeIdentityKey | null {
  // WPS 标题常见格式："文件名.docx - WPS Office" 或 "WPS 文字/PDF/表格/演示"
  if (/wps\s*(文字|word)/i.test(h) || /\.doc/i.test(h)) return 'word'
  if (/wps\s*(表格|excel)/i.test(h) || /\.xls/i.test(h)) return 'excel'
  if (/wps\s*(演示|ppt|presentation)/i.test(h) || /\.ppt/i.test(h)) return 'ppt'
  if (/wps\s*(pdf)/i.test(h) || /\.pdf/i.test(h)) return 'pdf'
  return null
}

function identityForDocKind(kind: DocTypeIdentityKey, processApp: string): WindowAppIdentity {
  return {
    displayName: DOC_DISPLAY[kind],
    identityKey: kind,
    processApp,
  }
}

function formatProcessDisplayName(exeKey: string): string {
  const base = exeKey.replace(/\.exe$/i, '') || 'unknown'
  if (base === 'unknown') return '未知应用'
  return base
}

export function isDocTypeIdentityKey(key: string): key is DocTypeIdentityKey {
  return (DOC_TYPE_IDENTITY_KEYS as readonly string[]).includes(key)
}

/** 由进程名、窗口标题、可执行路径解析应用（办公文档优先按扩展名显示 Word / Excel / PPT / PDF） */
export function resolveWindowAppIdentity(
  app: string,
  title = '',
  appPath = '',
): WindowAppIdentity {
  const processApp = String(app ?? '').trim() || 'unknown'
  const exe = normalizeWindowAppKey(processApp)
  const h = haystack(String(title ?? ''), String(appPath ?? ''))

  const fromExt = detectDocKind(h)
  if (fromExt) return identityForDocKind(fromExt, processApp)

  if (exe === 'winword') return identityForDocKind('word', processApp)
  if (exe === 'excel') return identityForDocKind('excel', processApp)
  if (exe === 'powerpnt') return identityForDocKind('ppt', processApp)
  if (exe === 'et') return identityForDocKind('excel', processApp)
  if (exe === 'wpp') return identityForDocKind('ppt', processApp)
  if (exe === 'acrobat' || exe === 'acrord32') return identityForDocKind('pdf', processApp)

  if (exe === 'wps' || h.includes('/office6/wps') || h.includes('kingsoft/wps')) {
    // WPS 打开文档时，优先按标题/路径推送的文档类型显示，
    // 避免额外多出一条"WPS"记录。
    const docFromWpsTitle = detectDocKindWps(h)
    if (docFromWpsTitle) return identityForDocKind(docFromWpsTitle, processApp)
    return { displayName: 'WPS', identityKey: 'wps', processApp }
  }

  if (exe === 'code' || exe === 'code-insiders' || exe === 'code - insiders') {
    return { displayName: 'VS Code', identityKey: 'vscode', processApp }
  }

  if (exe.startsWith('trae')) {
    return { displayName: 'Trae', identityKey: 'trae', processApp }
  }

  if (isGanshaleAppIdentity(exe, String(title ?? ''), String(appPath ?? ''))) {
    return { displayName: APP_DISPLAY_NAME, identityKey: 'ganshale', processApp }
  }

  const alias = APP_IDENTITY_ALIASES[exe]
  if (alias) {
    return {
      displayName: alias.displayName,
      identityKey: alias.identityKey,
      processApp,
    }
  }

  const systemLabel = SYSTEM_APP_DISPLAY[exe]
  if (systemLabel) {
    return { displayName: systemLabel, identityKey: exe, processApp }
  }

  const key = exe || 'unknown'
  return {
    displayName: formatProcessDisplayName(key),
    identityKey: key,
    processApp,
  }
}

export function applyAppDisplayNameOverride(identity: WindowAppIdentity): WindowAppIdentity {
  const custom = getAppDisplayNameOverride(identity.identityKey)
  if (!custom) return identity
  return { ...identity, displayName: custom }
}

export function identityFromEventData(data: Record<string, unknown>): WindowAppIdentity {
  return applyAppDisplayNameOverride(
    resolveWindowAppIdentity(
      String(data.app ?? 'unknown'),
      String(data.title ?? ''),
      String(data.appPath ?? ''),
    ),
  )
}

export function identityFromLiveForeground(live: {
  app: string
  title?: string
  appPath?: string
}): WindowAppIdentity {
  return applyAppDisplayNameOverride(
    resolveWindowAppIdentity(live.app, live.title ?? '', live.appPath ?? ''),
  )
}
