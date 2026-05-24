import { Eye, FileText, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMonthlyReportOptional } from '../context/MonthlyReportContext'
import { compareLocalCalendarMonth } from '../lib/monthlyWorktime'
import {
  formatMonthlyAutoTriggerLabel,
  loadReportScheduleSettings,
  REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT,
} from '../lib/reportScheduleSettings'
import { DAILY_CHROME_HEADER_TOOLBAR_MIN_H_CLASS } from './dashboardLayout'

const BTN_TOOLBAR_H = 'h-11 min-h-11 max-h-11'

const BTN_BASE = 'gs-toolbar-btn text-[11px]'
const BTN_VIEW_PAST = 'gs-toolbar-btn gs-toolbar-btn--past text-[11px]'
const BTN_GENERATE_ACTIVE =
  'gs-toolbar-btn gs-toolbar-btn--accent flex flex-col items-center justify-center gap-0.5 text-center text-[11px] font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-50'

/** 顶栏「查看月报」「生成月报」（月份选择器在左侧） */
export function MonthlyReportHeaderActions() {
  const report = useMonthlyReportOptional()
  const [autoLabel, setAutoLabel] = useState<string | null>(() => formatMonthlyAutoTriggerLabel())

  useEffect(() => {
    const sync = () => setAutoLabel(formatMonthlyAutoTriggerLabel(loadReportScheduleSettings()))
    window.addEventListener(REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT, sync)
  }, [])

  if (!report) return null

  const { monthAnchor, streaming, toast, onGenerate, openHistoryModal } = report
  const monthKind = compareLocalCalendarMonth(monthAnchor)
  const isFuture = monthKind === 'future'
  const isPast = monthKind === 'past'

  const viewDisabled = isFuture
  const generateDisabled = isFuture

  return (
    <div
      className={[
        'relative flex items-center gap-1.5',
        DAILY_CHROME_HEADER_TOOLBAR_MIN_H_CLASS,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => openHistoryModal()}
        className={[BTN_BASE, BTN_TOOLBAR_H, isPast && !viewDisabled ? BTN_VIEW_PAST : ''].join(
          ' ',
        )}
        disabled={viewDisabled}
      >
        <Eye
          className={[
            'h-3.5 w-3.5',
            viewDisabled ? 'opacity-50' : isPast ? 'opacity-90' : 'text-ganshale-muted',
          ].join(' ')}
          strokeWidth={1.8}
        />
        查看月报
      </button>
      <button
        type="button"
        onClick={() => onGenerate()}
        className={[BTN_GENERATE_ACTIVE, BTN_TOOLBAR_H].join(' ')}
        disabled={generateDisabled || streaming}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px]">
          {streaming ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={2} />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.8} />
          )}
          生成月报
        </span>
        {autoLabel ? (
          <span
            className={[
              'whitespace-nowrap text-[9px] font-normal leading-tight',
              generateDisabled ? 'text-ganshale-subtle' : 'text-white/75',
            ].join(' ')}
          >
            {autoLabel}
          </span>
        ) : null}
      </button>
      {toast ? (
        <p
          className="gs-popover-surface absolute right-0 top-full z-10 mt-1 max-w-[14rem] rounded-lg px-2 py-1 text-[10px] text-ganshale-muted"
          role="status"
        >
          {toast}
        </p>
      ) : null}
    </div>
  )
}
