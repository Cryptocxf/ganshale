import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const popup = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLSelectElement>(null)
  const [position, setPosition] = useState({left:0,top:0})
  return (
    <>
    <button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[10px] text-ganshale-muted" aria-label={ariaLabel} aria-haspopup="listbox" onClick={event => {
      const rect=event.currentTarget.getBoundingClientRect()
      setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-74)),top:Math.min(rect.bottom+4,window.innerHeight-160)})
      popup.current?.showPopover()
      list.current?.focus()
      requestAnimationFrame(() => list.current?.selectedOptions[0]?.scrollIntoView({block:'center'}))
    }}>
      <span>{optionKeyPrefix==='start'?'上班':'下班'}</span>
      <span className="text-[10px] tabular-nums text-ganshale-text">
        {formatWorkdayClock(hour, minute)}
      </span>
      <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <ChevronDown className="pointer-events-none h-3 w-3 text-ganshale-subtle" strokeWidth={2} aria-hidden />
      </span>
    </button>
    {createPortal(<div ref={popup} popover="auto" className="workday-time-popup" style={{position:'fixed',left:position.left,top:position.top,margin:0,padding:4,border:'1px solid var(--color-ganshale-border)',borderRadius:8,background:'var(--color-ganshale-surface)',color:'var(--color-ganshale-text)',boxShadow:'0 6px 24px #0002'}}>
        <select ref={list} size={6}
          value={halfHourSlotKey(hour, minute)}
          onChange={(e) => {onChange(e.target.value);popup.current?.hidePopover()}}
          onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();popup.current?.hidePopover()}}}
          className="workday-time-options block cursor-pointer border-0 bg-transparent text-ganshale-text outline-none"
          style={{width:56,height:144,fontSize:14,lineHeight:'24px',padding:0}}
          aria-label={ariaLabel}
        >
          {options.map((opt) => (
            <option key={`${optionKeyPrefix}-${opt.key}`} value={opt.key} style={{height:24,minHeight:24,padding:'3px 0',lineHeight:'18px'}}>
              {opt.label}
            </option>
          ))}
        </select>
    </div>,document.body)}
    </>
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
        <HalfHourTimeSelect
          hour={settings.startHour}
          minute={settings.startMinute}
          optionKeyPrefix="start"
          ariaLabel="上班时间"
          options={allOptions}
          onChange={onStartChange}
        />
        <HalfHourTimeSelect
          hour={settings.endHour}
          minute={settings.endMinute}
          optionKeyPrefix="end"
          ariaLabel="下班时间"
          options={endOptions}
          onChange={onEndChange}
        />
    </div>
  )
}
