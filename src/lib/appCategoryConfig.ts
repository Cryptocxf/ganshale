/** 本地持久化的应用窗口 → 工作分类规则（用于「应用分类速览」） */

export const APP_CATEGORY_STORAGE_KEY = 'ganshale-app-category-config-v1'
export const UNCATEGORIZED_ID = '__uncategorized__'

/** 与 lucide 图标名对应，便于序列化 */
export type AppCategoryIconId =
  | 'video'
  | 'file-text'
  | 'code-2'
  | 'message-circle'
  | 'folder-kanban'
  | 'briefcase'
  | 'layers'

export type AppCategoryDef = {
  id: string
  name: string
  iconId: AppCategoryIconId
  /** 匹配窗口标题或可执行名（不区分大小写，子串） */
  keywords: string[]
}

export const APP_CATEGORY_ICON_IDS: AppCategoryIconId[] = [
  'video',
  'file-text',
  'code-2',
  'message-circle',
  'folder-kanban',
  'briefcase',
  'layers',
]

function uid(): string {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export const DEFAULT_APP_CATEGORIES: AppCategoryDef[] = [
  {
    id: 'cat-meeting',
    name: '会议',
    iconId: 'video',
    keywords: [
      'teams',
      'zoom',
      '腾讯会议',
      '飞书会议',
      '钉钉会议',
      'webex',
      '会议',
      'meet.google',
      'skype',
      'facetime',
    ],
  },
  {
    id: 'cat-doc',
    name: '文档',
    iconId: 'file-text',
    keywords: [
      'word',
      'excel',
      'powerpnt',
      'ppt',
      'wps',
      'notion',
      'typora',
      'obsidian',
      'onenote',
      'pdf',
      'acrobat',
      '文档',
      'slides',
      'keynote',
    ],
  },
  {
    id: 'cat-dev',
    name: '开发',
    iconId: 'code-2',
    keywords: [
      'code',
      'cursor',
      'vscode',
      'visual studio',
      'jetbrains',
      'idea64',
      'webstorm',
      'rider',
      'goland',
      'pycharm',
      'terminal',
      'windows terminal',
      'powershell',
      'cmd',
      'git',
      'docker',
      'dev',
      '开发',
      'hyper',
      'iterm',
    ],
  },
  {
    id: 'cat-comms',
    name: '沟通',
    iconId: 'message-circle',
    keywords: [
      'slack',
      'discord',
      '微信',
      'wechat',
      'feishu',
      '飞书',
      'lark',
      'outlook',
      'mail',
      '邮箱',
      'telegram',
      'whatsapp',
      '沟通',
      '钉钉',
      'dingtalk',
    ],
  },
]

export function normalizeCategoryList(raw: unknown): AppCategoryDef[] {
  if (!Array.isArray(raw)) return structuredClone(DEFAULT_APP_CATEGORIES)
  const out: AppCategoryDef[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : uid()
    const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : '未命名'
    const iconId = APP_CATEGORY_ICON_IDS.includes(o.iconId as AppCategoryIconId)
      ? (o.iconId as AppCategoryIconId)
      : 'layers'
    const keywords: string[] = []
    if (Array.isArray(o.keywords)) {
      for (const k of o.keywords) {
        if (typeof k === 'string' && k.trim()) keywords.push(k.trim())
      }
    }
    out.push({ id, name, iconId, keywords })
  }
  return out
}

export function loadAppCategoryConfig(): AppCategoryDef[] {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_APP_CATEGORIES)
  try {
    const raw = localStorage.getItem(APP_CATEGORY_STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_APP_CATEGORIES)
    const parsed = JSON.parse(raw) as unknown
    return normalizeCategoryList(parsed)
  } catch {
    return structuredClone(DEFAULT_APP_CATEGORIES)
  }
}

export function saveAppCategoryConfig(categories: AppCategoryDef[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(APP_CATEGORY_STORAGE_KEY, JSON.stringify(categories))
  } catch {
    /* quota */
  }
}

export function createEmptyCategory(): AppCategoryDef {
  return {
    id: uid(),
    name: '新分类',
    iconId: 'layers',
    keywords: [],
  }
}
