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
  DASHBOARD_DETAIL_MODAL_SHELL_CLASS,
} from './dashboardLayout'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { StatusPulseDot } from './StatusPulseDot'

const selectCls =
  'w-full min-w-0 rounded-md border border-black/[0.08] bg-white py-1 pl-1.5 pr-6 text-[11px] text-ganshale-text shadow-sm focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10 disabled:cursor-not-allowed disabled:opacity-50'

const labelCls = 'mb-1 block text-[10px] font-medium text-ganshale-muted'

const btnSecondary =
  'rounded-md border border-black/[0.08] bg-white px-3 py-1 text-[11px] font-medium text-ganshale-text transition hover:bg-ganshale-page'
const btnPrimary =
  'rounded-md bg-zinc-900 px-3 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-800'

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
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className={DASHBOARD_DETAIL_MODAL_SHELL_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-record-settings-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-2 py-1.5 sm:px-3">
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

          <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-2">
            <button type="button" className={btnSecondary} onClick={onCancel}>
              取消
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={disabled}
              onClick={() => onSave(draft)}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function loadWorkRecordSettingsDraft(): WorkRecordSettingsDraft {
  return loadWorkRecordSettings()
}
