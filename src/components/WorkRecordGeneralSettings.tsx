import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  AI_SUMMARY_PERIOD_OPTIONS,
  WORK_RECORD_SETTINGS_CHANGED_EVENT,
  loadWorkRecordSettings,
  saveWorkRecordSettings,
  type SystemRecordPeriodId,
  type WorkRecordSettings,
} from '../lib/workRecordSettings'
import { SETTINGS_FIELD_LABEL_CLASS } from './dashboardLayout'

const selectCls =
  'gs-field-input h-8 w-[6.5rem] shrink-0 appearance-none rounded-md py-0 pl-2 pr-7 text-xs shadow-sm disabled:cursor-not-allowed disabled:opacity-50'

export function WorkRecordGeneralSettings() {
  const [settings, setSettings] = useState<WorkRecordSettings>(() => loadWorkRecordSettings())

  const syncFromStorage = useCallback(() => {
    setSettings(loadWorkRecordSettings())
  }, [])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, syncFromStorage)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, syncFromStorage)
    }
  }, [syncFromStorage])

  const persist = (next: WorkRecordSettings) => {
    setSettings(next)
    saveWorkRecordSettings(next)
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className={`flex shrink-0 cursor-pointer items-center gap-2 ${SETTINGS_FIELD_LABEL_CLASS}`}>
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-ganshale-border text-ganshale-text focus:ring-ganshale-text/20"
            checked={settings.aiAutoSummaryEnabled}
            onChange={(e) => {
              const enabled = e.target.checked
              persist({
                ...settings,
                aiAutoSummaryEnabled: enabled,
                systemRecordPeriod:
                  enabled && settings.systemRecordPeriod === 'none'
                    ? '30m'
                    : settings.systemRecordPeriod,
              })
            }}
          />
          <span>开启 AI 自动总结</span>
        </label>
        <div className="flex items-center gap-2">
          <label htmlFor="work-record-summary-period" className="shrink-0 text-ganshale-muted">
            自动总结间隔
          </label>
          <div className="relative">
            <select
              id="work-record-summary-period"
              className={selectCls}
              value={settings.systemRecordPeriod}
              disabled={!settings.aiAutoSummaryEnabled}
              onChange={(e) =>
                persist({
                  ...settings,
                  systemRecordPeriod: e.target.value as SystemRecordPeriodId,
                })
              }
            >
              {AI_SUMMARY_PERIOD_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ganshale-subtle"
              strokeWidth={2}
              aria-hidden
            />
          </div>
        </div>
      </div>

      <label className={`flex shrink-0 cursor-pointer items-center gap-2 ${SETTINGS_FIELD_LABEL_CLASS}`}>
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-ganshale-border text-ganshale-text focus:ring-ganshale-text/20"
          checked={settings.reflectPromptEnabled}
          onChange={(e) =>
            persist({
              ...settings,
              reflectPromptEnabled: e.target.checked,
            })
          }
        />
        <span>开启小回顾弹窗</span>
      </label>
      <p className="text-[10px] leading-relaxed text-ganshale-subtle">
        主窗口最小化后，切换应用且单段使用超过 10 分钟时弹出回顾（30 / 60 分钟仅影响文案）
      </p>
    </div>
  )
}
