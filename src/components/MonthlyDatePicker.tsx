import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addMonthsLocal,
  compareLocalCalendarMonth,
  formatMonthPickerLabel,
} from '../lib/monthlyWorktime'
import {
  loadMonthKeysWithMonthlyReports,
  MONTHLY_REPORT_HISTORY_CHANGED_EVENT,
} from '../lib/monthlyReportHistoryStore'
import { startOfMonthLocal } from '../lib/timeutil'

const BTN_H = 'h-11 min-h-11 max-h-11'
const POPOVER_W = 280

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

const SELECT_CLS = [
  'gs-field-input h-8 min-h-8 max-w-none shrink-0 cursor-pointer appearance-none rounded-md bg-no-repeat py-0 pl-2 pr-7',
  'bg-[length:11px_11px] bg-[position:right_0.4rem_center]',
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')]",
  'text-[11px] font-medium leading-none shadow-sm',
].join(' ')

function buildYearOptions(anchorYear: number): number[] {
  const min = anchorYear - 6
  const max = anchorYear + 2
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function MonthlyDatePicker({
  monthAnchor,
  onChange,
}: {
  monthAnchor: Date
  onChange: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftYear, setDraftYear] = useState(monthAnchor.getFullYear())
  const [draftMonth, setDraftMonth] = useState(monthAnchor.getMonth())
  const [monthsWithReports, setMonthsWithReports] = useState(() =>
    loadMonthKeysWithMonthlyReports(),
  )
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const label = useMemo(() => formatMonthPickerLabel(monthAnchor), [monthAnchor])
  const monthKind = useMemo(() => compareLocalCalendarMonth(monthAnchor), [monthAnchor])
  const selectedKey = monthKeyFromDate(monthAnchor)
  const hasReports = monthsWithReports.has(selectedKey)

  const yearOptions = useMemo(() => buildYearOptions(new Date().getFullYear()), [])

  useEffect(() => {
    const sync = () => setMonthsWithReports(loadMonthKeysWithMonthlyReports())
    window.addEventListener(MONTHLY_REPORT_HISTORY_CHANGED_EVENT, sync)
    return () => window.removeEventListener(MONTHLY_REPORT_HISTORY_CHANGED_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!open) return
    setDraftYear(monthAnchor.getFullYear())
    setDraftMonth(monthAnchor.getMonth())
  }, [open, monthAnchor])

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
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const goPrev = useCallback(() => {
    onChange(addMonthsLocal(monthAnchor, -1))
  }, [monthAnchor, onChange])

  const goNext = useCallback(() => {
    onChange(addMonthsLocal(monthAnchor, 1))
  }, [monthAnchor, onChange])

  const commitDraft = useCallback(() => {
    onChange(new Date(draftYear, draftMonth, 1, 12, 0, 0, 0))
    setOpen(false)
  }, [draftYear, draftMonth, onChange])

  const goCurrent = useCallback(() => {
    onChange(startOfMonthLocal(new Date()))
    setOpen(false)
  }, [onChange])

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
      aria-label="选择月份"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="gs-dashboard-modal__divider-b flex items-center justify-between gap-2 px-2.5 py-2">
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
          aria-label="上一月"
          onClick={() => {
            const d = new Date(draftYear, draftMonth - 1, 1, 12, 0, 0, 0)
            setDraftYear(d.getFullYear())
            setDraftMonth(d.getMonth())
          }}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <label className="sr-only" htmlFor="monthly-picker-year">
            选择年份
          </label>
          <select
            id="monthly-picker-year"
            className={[SELECT_CLS, 'w-[5.75rem]'].join(' ')}
            value={draftYear}
            onChange={(e) => setDraftYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="monthly-picker-month">
            选择月份
          </label>
          <select
            id="monthly-picker-month"
            className={[SELECT_CLS, 'w-[4.5rem]'].join(' ')}
            value={draftMonth}
            onChange={(e) => setDraftMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
          aria-label="下一月"
          onClick={() => {
            const d = new Date(draftYear, draftMonth + 1, 1, 12, 0, 0, 0)
            setDraftYear(d.getFullYear())
            setDraftMonth(d.getMonth())
          }}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="gs-dashboard-modal__divider-t flex flex-wrap gap-1 bg-ganshale-page/30 px-2 py-1.5">
        <button
          type="button"
          onClick={goCurrent}
          className="gs-toolbar-btn px-2 py-1 text-[10px]"
        >
          本月
        </button>
        <button
          type="button"
          onClick={commitDraft}
          className="gs-toolbar-btn gs-toolbar-btn--accent ml-auto px-2.5 py-1 text-[10px]"
        >
          确定
        </button>
      </div>
    </div>
  ) : null

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-1">
      <button
        type="button"
        className="gs-toolbar-btn px-1.5 py-0"
        style={{ height: 44, minHeight: 44, maxHeight: 44 }}
        aria-label="上一月"
        onClick={goPrev}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
      </button>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'gs-toolbar-btn gap-2 px-2.5 font-mono text-[11px] tabular-nums',
          BTN_H,
          monthKind === 'current' ? 'border-ganshale-mint/35' : '',
          hasReports ? 'border-ganshale-mint/30' : '',
        ].join(' ')}
        aria-label="选择月份"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-ganshale-muted" strokeWidth={1.8} />
        <span
          className={[
            'whitespace-nowrap font-semibold',
            hasReports ? 'text-ganshale-mint' : 'text-ganshale-text',
          ].join(' ')}
        >
          {label}
        </span>
      </button>

      <button
        type="button"
        className="gs-toolbar-btn px-1.5 py-0"
        style={{ height: 44, minHeight: 44, maxHeight: 44 }}
        aria-label="下一月"
        onClick={goNext}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
      </button>

      {popover ? createPortal(popover, document.body) : null}
    </div>
  )
}
