import { toYmdLocal } from './timeutil'

export const OBSIDIAN_REPORT_SETTINGS_CHANGED_EVENT = 'ganshale-obsidian-report-settings-changed'

export type ObsidianReportKind = 'daily' | 'weekly' | 'monthly'

export type ObsidianReportSettings = {
  enabled: boolean
  vaultPath: string
  folderName: string
}

const STORAGE_KEY = 'ganshale-obsidian-report-export-v1'

export const DEFAULT_OBSIDIAN_VAULT_PATH =
  'C:\\Users\\c1577\\Documents\\Obsidian Vault'

export const DEFAULT_OBSIDIAN_FOLDER_NAME = 'ganshale工作记录'

export function defaultObsidianReportSettings(): ObsidianReportSettings {
  return {
    enabled: true,
    vaultPath: DEFAULT_OBSIDIAN_VAULT_PATH,
    folderName: DEFAULT_OBSIDIAN_FOLDER_NAME,
  }
}

export function loadObsidianReportSettings(): ObsidianReportSettings {
  if (typeof window === 'undefined') return defaultObsidianReportSettings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultObsidianReportSettings()
    const o = JSON.parse(raw) as Partial<ObsidianReportSettings>
    const d = defaultObsidianReportSettings()
    return {
      enabled: typeof o.enabled === 'boolean' ? o.enabled : d.enabled,
      vaultPath:
        typeof o.vaultPath === 'string' && o.vaultPath.trim()
          ? o.vaultPath.trim()
          : d.vaultPath,
      folderName:
        typeof o.folderName === 'string' && o.folderName.trim()
          ? o.folderName.trim()
          : d.folderName,
    }
  } catch {
    return defaultObsidianReportSettings()
  }
}

export function saveObsidianReportSettings(next: ObsidianReportSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(OBSIDIAN_REPORT_SETTINGS_CHANGED_EVENT))
}

function monthKeyFromAnchor(anchor: Date): string {
  const m = new Date(anchor)
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
}

/** 相对 Vault 根目录的 Markdown 路径（使用 `/`） */
export function buildObsidianReportRelativePath(
  kind: ObsidianReportKind,
  anchor: Date,
  folderName = DEFAULT_OBSIDIAN_FOLDER_NAME,
): string {
  const folder = folderName.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  if (kind === 'daily') {
    return `${folder}/日报/${toYmdLocal(anchor)}.md`
  }
  if (kind === 'weekly') {
    return `${folder}/周报/${toYmdLocal(anchor)}.md`
  }
  return `${folder}/月报/${monthKeyFromAnchor(anchor)}.md`
}

function buildObsidianFrontmatter(kind: ObsidianReportKind, anchor: Date): string {
  const generatedAt = new Date().toISOString()
  const date =
    kind === 'monthly' ? monthKeyFromAnchor(anchor) : toYmdLocal(anchor)
  const typeLabel =
    kind === 'daily' ? 'daily-report' : kind === 'weekly' ? 'weekly-report' : 'monthly-report'
  return [
    '---',
    `type: ${typeLabel}`,
    `date: ${date}`,
    `generated: ${generatedAt}`,
    'source: ganshale',
    'tags:',
    '  - ganshale',
    '  - 工作记录',
    '---',
    '',
  ].join('\n')
}

/** 若正文已有一级标题则保留，否则仅加 frontmatter */
export function wrapObsidianReportMarkdown(
  kind: ObsidianReportKind,
  anchor: Date,
  body: string,
): string {
  const trimmed = body.trim()
  if (!trimmed) return trimmed
  return `${buildObsidianFrontmatter(kind, anchor)}${trimmed}\n`
}

export type ObsidianSyncResult = {
  ok: boolean
  filePath?: string
  error?: string
  skipped?: boolean
}

/** 桌面端：写入 Obsidian Vault；浏览器模式跳过 */
export async function syncReportToObsidian(
  kind: ObsidianReportKind,
  anchor: Date,
  markdownBody: string,
): Promise<ObsidianSyncResult> {
  const settings = loadObsidianReportSettings()
  if (!settings.enabled) {
    return { ok: true, skipped: true }
  }

  const desktop = typeof window !== 'undefined' ? window.ganshaleDesktop : undefined
  if (!desktop?.writeObsidianReport) {
    return { ok: true, skipped: true }
  }

  const content = wrapObsidianReportMarkdown(kind, anchor, markdownBody)
  if (!content) {
    return { ok: false, error: '报告内容为空' }
  }

  const relativePath = buildObsidianReportRelativePath(
    kind,
    anchor,
    settings.folderName,
  )

  try {
    const res = await desktop.writeObsidianReport({
      vaultPath: settings.vaultPath,
      relativePath,
      content,
    })
    if (!res.ok) {
      return { ok: false, error: res.error ?? '写入 Obsidian 失败' }
    }
    return { ok: true, filePath: res.filePath }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
