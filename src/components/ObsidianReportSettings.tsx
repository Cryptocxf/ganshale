import { FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_OBSIDIAN_FOLDER_NAME,
  DEFAULT_OBSIDIAN_VAULT_PATH,
  loadObsidianReportSettings,
  OBSIDIAN_REPORT_SETTINGS_CHANGED_EVENT,
  saveObsidianReportSettings,
  type ObsidianReportSettings,
} from '../lib/obsidianReportExport'
import { SETTINGS_FIELD_LABEL_CLASS } from './dashboardLayout'

const inputCls =
  'gs-field-input h-9 w-full min-w-0 rounded-lg px-2.5 text-xs shadow-sm disabled:cursor-not-allowed disabled:opacity-50'

export function ObsidianReportSettings() {
  const [settings, setSettings] = useState<ObsidianReportSettings>(() =>
    loadObsidianReportSettings(),
  )

  const syncFromStorage = useCallback(() => {
    setSettings(loadObsidianReportSettings())
  }, [])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(OBSIDIAN_REPORT_SETTINGS_CHANGED_EVENT, syncFromStorage)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(OBSIDIAN_REPORT_SETTINGS_CHANGED_EVENT, syncFromStorage)
    }
  }, [syncFromStorage])

  const persist = (next: ObsidianReportSettings) => {
    setSettings(next)
    saveObsidianReportSettings(next)
  }

  const openVaultFolder = () => {
    const path = settings.vaultPath.trim() || DEFAULT_OBSIDIAN_VAULT_PATH
    void window.ganshaleDesktop?.openPathInFolder?.(path)
  }

  const examplePath = `${settings.folderName || DEFAULT_OBSIDIAN_FOLDER_NAME}/日报/YYYY-MM-DD.md`

  return (
    <div className="space-y-3 border-t border-ganshale-border pt-4">
      <div>
        <p className={`${SETTINGS_FIELD_LABEL_CLASS} mb-1`}>Obsidian 自动导出</p>
        <p className="text-[10px] leading-relaxed text-ganshale-subtle">
          日报 / 周报 / 月报生成成功后，自动写入 Vault 下的 Markdown 文件（无目录则创建）。
        </p>
      </div>

      <label className={`flex cursor-pointer items-center gap-2 ${SETTINGS_FIELD_LABEL_CLASS}`}>
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-ganshale-border text-ganshale-text focus:ring-ganshale-text/20"
          checked={settings.enabled}
          onChange={(e) => persist({ ...settings, enabled: e.target.checked })}
        />
        <span>启用自动导出到 Obsidian</span>
      </label>

      <div className="space-y-2">
        <label htmlFor="obsidian-vault-path" className="block text-[11px] text-ganshale-muted">
          Vault 路径
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="obsidian-vault-path"
            type="text"
            className={inputCls}
            value={settings.vaultPath}
            disabled={!settings.enabled}
            placeholder={DEFAULT_OBSIDIAN_VAULT_PATH}
            onChange={(e) => persist({ ...settings, vaultPath: e.target.value })}
          />
          <button
            type="button"
            disabled={!settings.enabled}
            onClick={openVaultFolder}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ganshale-border bg-ganshale-page px-2.5 py-1.5 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            打开 Vault
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="obsidian-folder-name" className="block text-[11px] text-ganshale-muted">
          子文件夹名称
        </label>
        <input
          id="obsidian-folder-name"
          type="text"
          className={`${inputCls} max-w-xs`}
          value={settings.folderName}
          disabled={!settings.enabled}
          placeholder={DEFAULT_OBSIDIAN_FOLDER_NAME}
          onChange={(e) => persist({ ...settings, folderName: e.target.value })}
        />
        <p className="text-[10px] leading-relaxed text-ganshale-subtle">
          示例：{examplePath}；周报在 <code className="text-[10px]">周报/</code>，月报在{' '}
          <code className="text-[10px]">月报/</code>。
        </p>
      </div>
    </div>
  )
}
