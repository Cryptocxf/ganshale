import { ChevronDown, Clock } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  defaultReportScheduleSettings,
  HOUR_OPTIONS,
  loadReportScheduleSettings,
  MONTH_DAY_OPTIONS,
  REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT,
  saveReportScheduleSettings,
  WEEKDAY_OPTIONS,
  type ReportScheduleSettings,
} from '../lib/reportScheduleSettings'
import {
  defaultWorkRecordSettings,
  loadWorkRecordSettings,
  saveWorkRecordSettings,
} from '../lib/workRecordSettings'
import { WorkRecordGeneralSettings } from './WorkRecordGeneralSettings'
import {
  SETTINGS_FIELD_LABEL_CLASS,
  SETTINGS_PAGE_TITLE_CLASS,
} from './dashboardLayout'

const selectCls =
  'gs-field-input h-9 min-w-[5.5rem] shrink-0 appearance-none rounded-lg py-0 pl-2.5 pr-8 text-xs font-medium tabular-nums shadow-sm disabled:cursor-not-allowed disabled:opacity-50'
const checkCls =
  'h-3.5 w-3.5 rounded border-ganshale-border text-ganshale-text focus:ring-ganshale-text/20'

function ScheduleOptionPanel({
  disabled,
  className,
  children,
}: {
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={[
        'rounded-lg border border-ganshale-border/80 px-3 py-3',
        'bg-[color-mix(in_srgb,var(--color-ganshale-page)_50%,var(--color-ganshale-surface))]',
        disabled ? 'pointer-events-none opacity-45' : '',
        className ?? '',
      ].join(' ')}
      aria-disabled={disabled || undefined}
    >
      {children}
    </div>
  )
}

function AutoReportScheduleRow({
  label,
  checked,
  onCheckedChange,
  children,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-ganshale-border pt-4">
      <label
        className={`flex shrink-0 cursor-pointer items-center gap-2 self-center whitespace-nowrap ${SETTINGS_FIELD_LABEL_CLASS}`}
      >
        <input
          type="checkbox"
          className={checkCls}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        {label}
      </label>
      <ScheduleOptionPanel disabled={!checked} className="min-w-[12rem] flex-1">
        {children}
      </ScheduleOptionPanel>
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  id: string
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-xs text-ganshale-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={selectCls}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ganshale-subtle"
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  )
}

export function TimeSettings() {
  const [schedule, setSchedule] = useState<ReportScheduleSettings>(() =>
    loadReportScheduleSettings(),
  )

  const syncFromStorage = useCallback(() => {
    setSchedule(loadReportScheduleSettings())
  }, [])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener(REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT, syncFromStorage)
    return () =>
      window.removeEventListener(REPORT_SCHEDULE_SETTINGS_CHANGED_EVENT, syncFromStorage)
  }, [syncFromStorage])

  const persistSchedule = (next: ReportScheduleSettings) => {
    setSchedule(next)
    saveReportScheduleSettings(next)
  }

  const restoreDefaults = () => {
    const reportDefaults = defaultReportScheduleSettings()
    persistSchedule({
      ...schedule,
      dailyReportHour: reportDefaults.dailyReportHour,
      dailyReportMinute: 0,
      weeklyReportWeekday: reportDefaults.weeklyReportWeekday,
      weeklyReportHour: reportDefaults.weeklyReportHour,
      weeklyReportMinute: 0,
      monthlyReportDayOfMonth: reportDefaults.monthlyReportDayOfMonth,
      monthlyReportHour: reportDefaults.monthlyReportHour,
      monthlyReportMinute: 0,
    })
    const workDefaults = defaultWorkRecordSettings()
    const workCurrent = loadWorkRecordSettings()
    saveWorkRecordSettings({
      ...workCurrent,
      systemRecordPeriod: workDefaults.systemRecordPeriod,
      reflectPromptEnabled: workDefaults.reflectPromptEnabled,
    })
  }

  return (
    <section className="w-full rounded-xl border border-ganshale-border bg-ganshale-surface py-4 pl-4 pr-[10px] shadow-sm">
      <h3 className={SETTINGS_PAGE_TITLE_CLASS}>
        <Clock className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        时间
      </h3>

      <div className="mt-5 space-y-4 text-xs">
        <WorkRecordGeneralSettings />

        <AutoReportScheduleRow
          label="自动生成日报"
          checked={schedule.dailyReportAutoEnabled}
          onCheckedChange={(dailyReportAutoEnabled) =>
            persistSchedule({ ...schedule, dailyReportAutoEnabled })
          }
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <SelectField
              id="daily-report-hour"
              label="触发时间"
              disabled={!schedule.dailyReportAutoEnabled}
              value={schedule.dailyReportHour}
              options={HOUR_OPTIONS}
              onChange={(hour) =>
                persistSchedule({
                  ...schedule,
                  dailyReportHour: hour,
                  dailyReportMinute: 0,
                })
              }
            />
            <span className="text-[10px] leading-relaxed text-ganshale-subtle">
              本地时间整点，到点自动生成当日日报
            </span>
          </div>
        </AutoReportScheduleRow>

        <AutoReportScheduleRow
          label="自动生成周报"
          checked={schedule.weeklyReportAutoEnabled}
          onCheckedChange={(weeklyReportAutoEnabled) =>
            persistSchedule({ ...schedule, weeklyReportAutoEnabled })
          }
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <SelectField
              id="weekly-report-weekday"
              label="星期"
              disabled={!schedule.weeklyReportAutoEnabled}
              value={schedule.weeklyReportWeekday}
              options={WEEKDAY_OPTIONS}
              onChange={(weekday) =>
                persistSchedule({ ...schedule, weeklyReportWeekday: weekday })
              }
            />
            <SelectField
              id="weekly-report-hour"
              label="时间"
              disabled={!schedule.weeklyReportAutoEnabled}
              value={schedule.weeklyReportHour}
              options={HOUR_OPTIONS}
              onChange={(hour) =>
                persistSchedule({
                  ...schedule,
                  weeklyReportHour: hour,
                  weeklyReportMinute: 0,
                })
              }
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ganshale-subtle">
            在选定星期的整点，为本周自动生成周报
          </p>
        </AutoReportScheduleRow>

        <AutoReportScheduleRow
          label="自动生成月报"
          checked={schedule.monthlyReportAutoEnabled}
          onCheckedChange={(monthlyReportAutoEnabled) =>
            persistSchedule({ ...schedule, monthlyReportAutoEnabled })
          }
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <SelectField
              id="monthly-report-day"
              label="日期"
              disabled={!schedule.monthlyReportAutoEnabled}
              value={schedule.monthlyReportDayOfMonth}
              options={MONTH_DAY_OPTIONS}
              onChange={(day) =>
                persistSchedule({ ...schedule, monthlyReportDayOfMonth: day })
              }
            />
            <SelectField
              id="monthly-report-hour"
              label="时间"
              disabled={!schedule.monthlyReportAutoEnabled}
              value={schedule.monthlyReportHour}
              options={HOUR_OPTIONS}
              onChange={(hour) =>
                persistSchedule({
                  ...schedule,
                  monthlyReportHour: hour,
                  monthlyReportMinute: 0,
                })
              }
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ganshale-subtle">
            在每月选定日期的整点，为本月自动生成月报（31 日在短月取当月最后一天）
          </p>
        </AutoReportScheduleRow>

        <div className="border-t border-ganshale-border pt-4">
          <button
            type="button"
            onClick={restoreDefaults}
            className="rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-1.5 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated"
          >
            恢复默认时间
          </button>
        </div>
      </div>
    </section>
  )
}
