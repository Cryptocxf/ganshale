import { Settings2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AI_SUMMARY_PERIOD_OPTIONS,
  isAiAutoSummaryActive,
  loadWorkRecordSettings,
  type SystemRecordPeriodId,
  type WorkRecordSettings,
} from '../lib/workRecordSettings'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  GS_FIELD_INPUT_MD_CLASS,
  GS_MODAL_FOOTER_DIVIDER_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { StatusPulseDot } from './StatusPulseDot'

const selectCls = `${GS_FIELD_INPUT_MD_CLASS} w-full min-w-0 py-1 pl-1.5 pr-6 shadow-sm disabled:cursor-not-allowed disabled:opacity-50`

const labelCls = 'mb-1 block text-[10px] font-medium text-ganshale-muted'

export type WorkRecordSettingsDraft = WorkRecordSettings

export function WorkRecordSettingsModal({
  initial,
  disabled,
  onCancel,
  onSave,
}: {
  initial: WorkRecordSettingsDraft
  disabled?: boolean
  onCancel: () => void
  onSave: (draft: WorkRecordSettingsDraft) => void
}) {
  const [draft, setDraft] = useState<WorkRecordSettings>(initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const aiActive = isAiAutoSummaryActive(draft)

  return (
    <DashboardModalRoot
      open
      onClose={onCancel}
      labelledBy="work-record-settings-modal-title"
      dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
    >
        <div
          className={`flex items-center justify-between px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
        >
          <DashboardSectionTitle id="work-record-settings-modal-title" icon={Settings2}>
            工作记录设置
          </DashboardSectionTitle>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <div
          className={[DASHBOARD_DETAIL_MODAL_BODY_CLASS, 'flex flex-col gap-3 sm:px-3 sm:py-2'].join(' ')}
        >
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ganshale-text">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-ganshale-border"
              checked={draft.aiAutoSummaryEnabled}
              disabled={disabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, aiAutoSummaryEnabled: e.target.checked }))
              }
            />
            开启 AI 自动总结
          </label>

          {aiActive ? (
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-semibold leading-none text-emerald-950"
              role="status"
            >
              <StatusPulseDot active />
              AI自动总结中
            </span>
          ) : null}

          <div>
            <label htmlFor="work-record-period" className={labelCls}>
              自动总结间隔：
            </label>
            <select
              id="work-record-period"
              value={draft.systemRecordPeriod}
              disabled={disabled || !draft.aiAutoSummaryEnabled}
              className={selectCls}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  systemRecordPeriod: e.target.value as SystemRecordPeriodId,
                }))
              }
            >
              {AI_SUMMARY_PERIOD_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ganshale-text">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-ganshale-border"
              checked={draft.reflectPromptEnabled}
              disabled={disabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, reflectPromptEnabled: e.target.checked }))
              }
            />
            开启小回顾弹窗
          </label>

          <div className={`flex justify-end gap-2 pt-2 ${GS_MODAL_FOOTER_DIVIDER_CLASS}`}>
            <button type="button" className={DASHBOARD_HEADER_ACTION_BTN_CLASS} onClick={onCancel}>
              取消
            </button>
            <button
              type="button"
              className="gs-toolbar-btn gs-toolbar-btn--accent px-3 py-1 text-[11px]"
              disabled={disabled}
              onClick={() => onSave(draft)}
            >
              保存
            </button>
          </div>
        </div>
    </DashboardModalRoot>
  )
}

export function loadWorkRecordSettingsDraft(): WorkRecordSettingsDraft {
  return loadWorkRecordSettings()
}
