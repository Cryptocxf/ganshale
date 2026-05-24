import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatWeekPickerLabel, isoWeekNumberLocal } from '../lib/weeklyWorktime'
import {
  daysInLocalWeek,
  endOfMonthLocal,
  endOfWeekSundayLocal,
  isSameLocalCalendarDay,
  startOfMonthLocal,
  startOfWeekMondayLocal,
  toYmdLocal,
} from '../lib/timeutil'

const WEEKDAY_HEADER = ['一', '二', '三', '四', '五', '六', '日'] as const
const ROW_H = 28
const POPOVER_W = 336
const MONTH_NAMES = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
] as const

const BTN_H = 'h-11 min-h-11 max-h-11'
/** 隐藏系统下拉箭头，仅保留右侧向下 chevron */
const SELECT_CLS = [
  'gs-field-input h-8 min-h-8 max-w-none shrink-0 cursor-pointer appearance-none rounded-md bg-no-repeat py-0 pl-2 pr-7',
  'bg-[length:11px_11px] bg-[position:right_0.4rem_center]',
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')]",
  'text-[11px] font-medium leading-none shadow-sm',
].join(' ')

type WeekOption = {
  weekStart: Date
  weekKey: string
  weekNo: number
  days: Date[]
}

function addWeeks(weekStartMonday: Date, delta: number): Date {
  const x = new Date(weekStartMonday)
  x.setDate(x.getDate() + delta * 7)
  return startOfWeekMondayLocal(x)
}

function addMonths(d: Date, delta: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + delta, 1)
  x.setHours(12, 0, 0, 0)
  return x
}

function buildWeekOption(weekStartMonday: Date): WeekOption {
  const mon = startOfWeekMondayLocal(weekStartMonday)
  return {
    weekStart: mon,
    weekKey: toYmdLocal(mon),
    weekNo: isoWeekNumberLocal(mon),
    days: daysInLocalWeek(mon),
  }
}

function weeksInMonth(viewMonth: Date): WeekOption[] {
  const first = startOfMonthLocal(viewMonth)
  const last = endOfMonthLocal(viewMonth)
  let mon = startOfWeekMondayLocal(first)
  const out: WeekOption[] = []
  const seen = new Set<string>()
  while (out.length < 6) {
    const sunday = endOfWeekSundayLocal(mon)
    if (mon > last && sunday > last) break
    const opt = buildWeekOption(mon)
    if (!seen.has(opt.weekKey)) {
      seen.add(opt.weekKey)
      out.push(opt)
    }
    mon = addWeeks(mon, 1)
  }
  if (out.length === 0) out.push(buildWeekOption(startOfWeekMondayLocal(viewMonth)))
  return out
}

function buildYearOptions(anchorYear: number): number[] {
  const min = anchorYear - 6
  const max = anchorYear + 2
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

function WeekCalendarPanel({
  viewMonth,
  options,
  activeKey,
  currentWeekKey,
  weeksWithReports,
  onActiveKeyChange,
}: {
  viewMonth: Date
  options: WeekOption[]
  activeKey: string
  currentWeekKey: string
  weeksWithReports?: ReadonlySet<string>
  onActiveKeyChange: (opt: WeekOption) => void
}) {
  const today = useMemo(() => new Date(), [])

  return (
    <div className="px-2 pb-2">
      <div className="flex shrink-0 border-b border-ganshale-border pb-1">
        <div className="w-[3rem] shrink-0" aria-hidden />
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-0.5 text-center text-[9px] font-medium text-ganshale-subtle">
          {WEEKDAY_HEADER.map((w) => (
            <span key={w} className="py-0.5">
              {w}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {options.map((opt) => {
          const isActive = opt.weekKey === activeKey
          const isCurrentWeek = opt.weekKey === currentWeekKey
          const hasReports = weeksWithReports?.has(opt.weekKey) ?? false

          return (
            <button
              key={opt.weekKey}
              type="button"
              className={[
                'flex w-full items-stretch text-left transition',
                isCurrentWeek
                  ? 'bg-emerald-50/95 ring-1 ring-emerald-400/45 ring-inset'
                  : isActive
                    ? 'bg-violet-50/80 ring-1 ring-violet-300/50 ring-inset'
                    : 'hover:bg-black/[0.03]',
              ].join(' ')}
              style={{ height: ROW_H }}
              onClick={() => onActiveKeyChange(opt)}
            >
              <span
                className={[
                  'flex w-[3rem] shrink-0 items-center justify-center text-[10px] font-semibold tabular-nums',
                  isCurrentWeek
                    ? 'text-emerald-800'
                    : isActive
                      ? 'text-violet-800'
                      : hasReports
                        ? 'text-ganshale-mint'
                        : 'text-ganshale-muted',
                ].join(' ')}
              >
                第{opt.weekNo}周
              </span>
              <span className="grid min-w-0 flex-1 grid-cols-7 gap-0.5 px-0.5">
                {opt.days.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth()
                  const isToday = isSameLocalCalendarDay(day, today)
                  return (
                    <span
                      key={toYmdLocal(day)}
                      className={[
                        'flex h-6 items-center justify-center rounded text-[10px] tabular-nums',
                        !inMonth ? 'text-ganshale-subtle/50' : 'text-ganshale-text',
                        isToday && !isCurrentWeek
                          ? 'font-semibold ring-1 ring-sky-400/55 ring-inset'
                          : '',
                        isToday && isCurrentWeek ? 'font-bold text-emerald-900' : '',
                      ].join(' ')}
                    >
                      {day.getDate()}
                    </span>
                  )
                })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function WeeklyDatePicker({
  weekStart,
  onChange,
  weeksWithReports,
}: {
  weekStart: Date
  onChange: (weekStartMonday: Date) => void
  weeksWithReports?: ReadonlySet<string>
}) {
  const [open, setOpen] = useState(false)
  const [draftKey, setDraftKey] = useState('')
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonthLocal(startOfWeekMondayLocal(new Date())),
  )
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const currentWeekMonday = useMemo(() => startOfWeekMondayLocal(new Date()), [])
  const currentWeekKey = toYmdLocal(currentWeekMonday)

  const monday = useMemo(() => startOfWeekMondayLocal(weekStart), [weekStart])
  const selectedKey = toYmdLocal(monday)
  const weekNo = isoWeekNumberLocal(monday)
  const weekRangeLabel = useMemo(() => formatWeekPickerLabel(monday, weekNo), [monday, weekNo])
  const hasReports = weeksWithReports?.has(selectedKey) ?? false

  const viewYear = viewMonth.getFullYear()
  const viewMonthIndex = viewMonth.getMonth()
  const yearOptions = useMemo(() => buildYearOptions(new Date().getFullYear()), [])

  const weekOptions = useMemo(() => weeksInMonth(viewMonth), [viewMonth])

  const draftOption = useMemo(() => {
    const key = draftKey || currentWeekKey
    return (
      weekOptions.find((o) => o.weekKey === key) ??
      buildWeekOption(currentWeekMonday)
    )
  }, [weekOptions, draftKey, currentWeekKey, currentWeekMonday])

  const updatePopoverPosition = useCallback(() => {
    const btn = triggerRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const left = Math.min(
      Math.max(8, r.right - POPOVER_W),
      window.innerWidth - POPOVER_W - 8,
    )
    setPopoverPos({ top: r.bottom + 6, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open, updatePopoverPosition])

  useEffect(() => {
    if (!open) return
    setDraftKey(currentWeekKey)
    setViewMonth(startOfMonthLocal(new Date()))
  }, [open, currentWeekKey])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const setYearMonth = useCallback((year: number, month: number) => {
    setViewMonth(new Date(year, month, 1, 12, 0, 0, 0))
  }, [])

  const applyDraft = useCallback(
    (key: string) => {
      const opt =
        weekOptions.find((o) => o.weekKey === key) ?? buildWeekOption(currentWeekMonday)
      setDraftKey(opt.weekKey)
      setViewMonth(startOfMonthLocal(opt.weekStart))
    },
    [weekOptions, currentWeekMonday],
  )

  const commitDraft = useCallback(() => {
    onChange(draftOption.weekStart)
    setOpen(false)
  }, [draftOption.weekStart, onChange])

  const activeKey = draftKey || currentWeekKey

  const popover = open ? (
    <div
      ref={popoverRef}
      className="gs-card fixed overflow-visible rounded-xl p-0 shadow-xl"
      style={{
        top: popoverPos.top,
        left: popoverPos.left,
        width: POPOVER_W,
        zIndex: 200,
      }}
      role="dialog"
      aria-label="选择周"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="gs-dashboard-modal__divider-b flex items-center justify-between gap-2 overflow-visible px-2.5 py-2">
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
          aria-label="上一月"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-visible">
          <label className="sr-only" htmlFor="weekly-picker-year">
            选择年份
          </label>
          <select
            id="weekly-picker-year"
            className={[SELECT_CLS, 'w-[5.75rem]'].join(' ')}
            value={viewYear}
            onChange={(e) => setYearMonth(Number(e.target.value), viewMonthIndex)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="weekly-picker-month">
            选择月份
          </label>
          <select
            id="weekly-picker-month"
            className={[SELECT_CLS, 'w-[4.5rem]'].join(' ')}
            value={viewMonthIndex}
            onChange={(e) => setYearMonth(viewYear, Number(e.target.value))}
          >
            {MONTH_NAMES.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
          aria-label="下一月"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <WeekCalendarPanel
        viewMonth={viewMonth}
        options={weekOptions}
        activeKey={activeKey}
        currentWeekKey={currentWeekKey}
        weeksWithReports={weeksWithReports}
        onActiveKeyChange={(opt) => setDraftKey(opt.weekKey)}
      />

      <div className="gs-dashboard-modal__divider-t flex flex-wrap gap-1 bg-ganshale-page/30 px-2 py-1.5">
        <button
          type="button"
          onClick={() => applyDraft(currentWeekKey)}
          className={[
            'gs-toolbar-btn px-2 py-1 text-[10px]',
            activeKey === currentWeekKey ? 'gs-toolbar-btn--accent' : '',
          ].join(' ')}
        >
          本周
        </button>
        <button
          type="button"
          onClick={() => {
            applyDraft(toYmdLocal(addWeeks(currentWeekMonday, -1)))
          }}
          className="gs-toolbar-btn px-2 py-1 text-[10px]"
        >
          上周
        </button>
        <button
          type="button"
          onClick={() => commitDraft()}
          className="gs-toolbar-btn gs-toolbar-btn--accent ml-auto px-2.5 py-1 text-[10px]"
        >
          确定
        </button>
      </div>
    </div>
  ) : null

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'gs-toolbar-btn gap-2 px-2.5 font-mono text-[11px] tabular-nums',
          BTN_H,
          hasReports ? 'border-ganshale-mint/30' : '',
        ].join(' ')}
        aria-label="选择周"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-ganshale-muted" strokeWidth={1.8} />
        <span
          className={[
            'whitespace-nowrap',
            hasReports ? 'font-semibold text-ganshale-mint' : 'font-semibold text-ganshale-text',
          ].join(' ')}
        >
          {weekRangeLabel}
        </span>
      </button>

      {popover ? createPortal(popover, document.body) : null}
    </div>
  )
}
