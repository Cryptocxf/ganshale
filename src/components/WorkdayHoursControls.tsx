import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatWorkdayClock,
  halfHourSlotKey,
  halfHourTimeOptions,
  loadWorkdayHoursSettings,
  parseHalfHourSlotKey,
  saveWorkdayHoursSettings,
  WORKDAY_HOURS_SETTINGS_CHANGED_EVENT,
  type WorkdayHoursSettings,
} from '../lib/workdayHoursConfig'
import { DASHBOARD_HEADER_ACTIONS_ROW_CLASS } from './dashboardLayout'

const fieldCls = 'inline-flex items-center gap-1 text-[10px] text-ganshale-muted'

function HalfHourTimeSelect({
  hour,
  minute,
  optionKeyPrefix,
  ariaLabel,
  options,
  onChange,
}: {
  hour: number
  minute: number
  optionKeyPrefix: string
  ariaLabel: string
  options: ReturnType<typeof halfHourTimeOptions>
  onChange: (value: string) => void
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-[10px] tabular-nums text-ganshale-text">
        {formatWorkdayClock(hour, minute)}
      </span>
      <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <select
          value={halfHourSlotKey(hour, minute)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 z-[1] cursor-pointer opacity-0"
          aria-label={ariaLabel}
        >
          {options.map((opt) => (
            <option key={`${optionKeyPrefix}-${opt.key}`} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none h-3 w-3 text-ganshale-subtle"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </span>
  )
}

export function WorkdayHoursControls() {
  const [settings, setSettings] = useState<WorkdayHoursSettings>(() => loadWorkdayHoursSettings())
  const allOptions = useMemo(() => halfHourTimeOptions(), [])

  useEffect(() => {
    const sync = () => setSettings(loadWorkdayHoursSettings())
    window.addEventListener(WORKDAY_HOURS_SETTINGS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(WORKDAY_HOURS_SETTINGS_CHANGED_EVENT, sync)
  }, [])

  // End-time options: only times strictly after current start
  const endOptions = useMemo(() => {
    const startMin = settings.startHour * 60 + settings.startMinute
    return allOptions.filter((opt) => opt.hour * 60 + opt.minute > startMin)
  }, [allOptions, settings.startHour, settings.startMinute])

  const onStartChange = useCallback(
    (value: string) => {
      const parsed = parseHalfHourSlotKey(value)
      if (!parsed) return
      const newStartMin = parsed.hour * 60 + parsed.minute
      const currentEndMin = settings.endHour * 60 + settings.endMinute
      // If new start >= current end, push end forward by 30 min
      let endHour = settings.endHour
      let endMinute = settings.endMinute
      if (newStartMin >= currentEndMin) {
        const newEndMin = Math.min(newStartMin + 30, 23 * 60 + 30)
        endHour = Math.floor(newEndMin / 60)
        endMinute = newEndMin % 60
      }
      const next = { startHour: parsed.hour, startMinute: parsed.minute, endHour, endMinute }
      setSettings(next)
      saveWorkdayHoursSettings(next)
    },
    [settings],
  )

  const onEndChange = useCallback(
    (value: string) => {
      const parsed = parseHalfHourSlotKey(value)
      if (!parsed) return
      // Reject if end <= start
      if (parsed.hour * 60 + parsed.minute <= settings.startHour * 60 + settings.startMinute) return
      const next = { ...settings, endHour: parsed.hour, endMinute: parsed.minute }
      setSettings(next)
      saveWorkdayHoursSettings(next)
    },
    [settings],
  )

  return (
    <div className={DASHBOARD_HEADER_ACTIONS_ROW_CLASS} aria-label="上下班时间设定">
      <label className={fieldCls}>
        <span className="shrink-0">上班</span>
        <HalfHourTimeSelect
          hour={settings.startHour}
          minute={settings.startMinute}
          optionKeyPrefix="start"
          ariaLabel="上班时间"
          options={allOptions}
          onChange={onStartChange}
        />
      </label>
      <label className={fieldCls}>
        <span className="shrink-0">下班</span>
        <HalfHourTimeSelect
          hour={settings.endHour}
          minute={settings.endMinute}
          optionKeyPrefix="end"
          ariaLabel="下班时间"
          options={endOptions}
          onChange={onEndChange}
        />
      </label>
    </div>
  )
}
