/** 本地持久化的应用窗口 → 工作分类规则（用于「应用分类分布」） */

import { isDocTypeIdentityKey } from './windowAppDisplay'

export const APP_CATEGORY_STORAGE_KEY = 'ganshale-app-category-config-v2'
const APP_CATEGORY_STORAGE_KEY_V1 = 'ganshale-app-category-config-v1'
export const APP_CATEGORY_CONFIG_CHANGED_EVENT = 'ganshale-app-category-config-changed'

export const UNCATEGORIZED_ID = '__uncategorized__'

export const FIXED_CATEGORY_IDS = ['cat-dev', 'cat-comms', 'cat-doc'] as const

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
  /** 归属该分类的应用可执行名（与「应用时长对比」一致，如 `Code.exe`） */
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
    id: 'cat-dev',
    name: '开发',
    iconId: 'code-2',
    keywords: [],
  },
  {
    id: 'cat-comms',
    name: '沟通',
    iconId: 'message-circle',
    keywords: [],
  },
  {
    id: 'cat-doc',
    name: '文档',
    iconId: 'file-text',
    keywords: [],
  },
]

function parseCategoryRow(row: unknown): AppCategoryDef | null {
  if (!row || typeof row !== 'object') return null
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
  return { id, name, iconId, keywords }
}

export function normalizeAppExeKey(exe: string): string {
  return exe.trim().toLowerCase()
}

/** 将存储的关键词统一为 identityKey（与「应用时长对比」行键一致）或可执行名 */
export function normalizeAssignmentKey(keyword: string): string {
  const k = keyword.trim()
  if (!k) return k
  if (isDocTypeIdentityKey(k)) return k
  const exe = normalizeAppExeKey(k)
  if (exe === 'winword.exe' || exe === 'winword') return 'word'
  if (exe === 'excel.exe' || exe === 'excel') return 'excel'
  if (exe === 'et.exe' || exe === 'et') return 'excel'
  if (exe === 'powerpnt.exe' || exe === 'powerpnt') return 'ppt'
  if (exe === 'wpp.exe' || exe === 'wpp') return 'ppt'
  if (exe === 'acrobat.exe' || exe === 'acrord32.exe') return 'pdf'
  if (exe === 'code.exe' || exe === 'code-insiders.exe' || exe === 'code - insiders.exe') {
    return 'vscode'
  }
  if (exe === 'wps.exe' || exe === 'wps') return 'wps'
  return k
}

function assignmentKeyDedupeId(keyword: string): string {
  return normalizeAppExeKey(normalizeAssignmentKey(keyword))
}

function sanitizeAssignedApps(keywords: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of keywords) {
    const norm = normalizeAssignmentKey(k)
    if (!norm) continue
    const dedupe = assignmentKeyDedupeId(norm)
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    out.push(norm)
  }
  return out
}

export function normalizeCategoryList(raw: unknown): AppCategoryDef[] {
  const defaults = structuredClone(DEFAULT_APP_CATEGORIES)
  if (!Array.isArray(raw)) return defaults

  const byId = new Map<string, AppCategoryDef>()
  for (const row of raw) {
    const parsed = parseCategoryRow(row)
    if (parsed) byId.set(parsed.id, parsed)
  }

  const fixedIds = new Set(defaults.map((d) => d.id))
  const merged = defaults.map((d) => {
    const saved = byId.get(d.id)
    if (!saved) return d
    return {
      ...d,
      name: saved.name,
      iconId: saved.iconId,
      keywords: sanitizeAssignedApps(saved.keywords),
    }
  })

  for (const [id, saved] of byId) {
    if (fixedIds.has(id)) continue
    merged.push({
      ...saved,
      keywords: sanitizeAssignedApps(saved.keywords),
    })
  }

  return merged
}

function migrateFromV1(): AppCategoryDef[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(APP_CATEGORY_STORAGE_KEY_V1)
    if (!raw) return null
    const migrated = normalizeCategoryList(JSON.parse(raw) as unknown)
    return migrated.map((c) => ({ ...c, keywords: [] }))
  } catch {
    return null
  }
}

export function loadAppCategoryConfig(): AppCategoryDef[] {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_APP_CATEGORIES)
  try {
    let raw = localStorage.getItem(APP_CATEGORY_STORAGE_KEY)
    if (!raw) {
      const migrated = migrateFromV1()
      if (migrated) {
        saveAppCategoryConfig(migrated)
        return migrated
      }
      return structuredClone(DEFAULT_APP_CATEGORIES)
    }
    const parsed = JSON.parse(raw) as unknown
    const normalized = normalizeCategoryList(parsed)
    const sanitized = JSON.stringify(normalized)
    if (sanitized !== raw) {
      saveAppCategoryConfig(normalized)
    }
    return normalized
  } catch {
    return structuredClone(DEFAULT_APP_CATEGORIES)
  }
}

export function saveAppCategoryConfig(categories: AppCategoryDef[]): void {
  if (typeof window === 'undefined') return
  try {
    const normalized = normalizeCategoryList(categories)
    localStorage.setItem(APP_CATEGORY_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new Event(APP_CATEGORY_CONFIG_CHANGED_EVENT))
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

export function addCategoryToList(categories: AppCategoryDef[]): AppCategoryDef[] {
  return [...categories, createEmptyCategory()]
}

export function isFixedCategoryId(categoryId: string): boolean {
  return (FIXED_CATEGORY_IDS as readonly string[]).includes(categoryId)
}

export function appMatchesCategoryKeyword(appExe: string, keyword: string): boolean {
  const a = normalizeAppExeKey(appExe)
  const k = normalizeAppExeKey(keyword)
  if (!a || !k) return false
  if (a === k) return true
  const stripExe = (s: string) => s.replace(/\.exe$/i, '')
  return stripExe(a) === stripExe(k)
}

/** 将应用加入指定分类，并从其它分类中移除 */
export function addAppToCategoryList(
  categories: AppCategoryDef[],
  categoryId: string,
  appExe: string,
): AppCategoryDef[] {
  const key = appExe.trim()
  if (!key) return categories
  const norm = normalizeAppExeKey(key)
  return categories.map((c) => {
    const filtered = c.keywords.filter((k) => normalizeAppExeKey(k) !== norm)
    if (c.id === categoryId) {
      if (filtered.some((k) => normalizeAppExeKey(k) === norm)) return { ...c, keywords: filtered }
      return { ...c, keywords: [...filtered, key] }
    }
    return { ...c, keywords: filtered }
  })
}

export function assignmentKeyMatches(keyword: string, ...candidates: string[]): boolean {
  const kNorm = normalizeAssignmentKey(keyword.trim())
  if (!kNorm) return false
  const kKey = assignmentKeyDedupeId(kNorm)
  for (const raw of candidates) {
    const cNorm = normalizeAssignmentKey(String(raw ?? '').trim())
    if (!cNorm) continue
    if (assignmentKeyDedupeId(cNorm) === kKey) return true
    if (appMatchesCategoryKeyword(cNorm, kNorm)) return true
    if (appMatchesCategoryKeyword(kNorm, cNorm)) return true
  }
  return false
}

export function findCategoryHostingApp(
  categories: AppCategoryDef[],
  excludeCategoryId: string,
  appExe: string,
  identityKey: string,
): AppCategoryDef | undefined {
  for (const cat of categories) {
    if (cat.id === excludeCategoryId) continue
    for (const kw of cat.keywords) {
      if (assignmentKeyMatches(kw, appExe, identityKey)) return cat
    }
  }
  return undefined
}

export function isAppAssignedInCategories(
  categories: AppCategoryDef[],
  excludeCategoryId: string,
  appExe: string,
  identityKey: string,
  extraKeywords: string[] = [],
): boolean {
  for (const kw of extraKeywords) {
    if (assignmentKeyMatches(kw, appExe, identityKey)) return true
  }
  for (const cat of categories) {
    if (cat.id === excludeCategoryId) continue
    for (const kw of cat.keywords) {
      if (assignmentKeyMatches(kw, appExe, identityKey)) return true
    }
  }
  return false
}

export function resetCategoryInList(
  categories: AppCategoryDef[],
  categoryId: string,
): AppCategoryDef[] {
  const def = DEFAULT_APP_CATEGORIES.find((d) => d.id === categoryId)
  if (def) {
    return categories.map((c) =>
      c.id === categoryId ? { ...c, name: def.name, keywords: [] } : c,
    )
  }
  return categories.filter((c) => c.id !== categoryId)
}

export function applyCategorySave(
  categories: AppCategoryDef[],
  categoryId: string,
  name: string,
  appExes: string[],
): AppCategoryDef[] {
  const saved = appExes.map((k) => normalizeAssignmentKey(k.trim())).filter(Boolean)
  return categories.map((c) => {
    if (c.id === categoryId) {
      return { ...c, name, keywords: saved }
    }
    return {
      ...c,
      keywords: c.keywords.filter(
        (k) => !saved.some((s) => assignmentKeyMatches(s, k)),
      ),
    }
  })
}
