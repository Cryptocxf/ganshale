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

/** 窗口标题 / 路径中的扩展名（优先于进程名） */
const DOC_EXT: Record<DocTypeIdentityKey, RegExp> = {
  pdf: /\.pdf(\s|$| -|\)|\]|\[|，|,)/i,
  ppt: /\.pptx?(\s|$| -|\)|\]|\[|，|,)/i,
  excel: /\.(xlsx?|xls)(\s|$| -|\)|\]|\[|，|,)/i,
  word: /\.(docx?|doc)(\s|$| -|\)|\]|\[|，|,)/i,
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
    return { displayName: 'WPS', identityKey: 'wps', processApp }
  }

  if (exe === 'code' || exe === 'code-insiders' || exe === 'code - insiders') {
    return { displayName: 'VS Code', identityKey: 'vscode', processApp }
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
