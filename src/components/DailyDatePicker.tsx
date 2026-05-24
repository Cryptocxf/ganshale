import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  endOfMonthLocal,
  isSameLocalCalendarDay,
  startOfMonthLocal,
  toYmdLocal,
} from '../lib/timeutil'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const

function addMonths(d: Date, delta: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + delta, 1)
  x.setHours(12, 0, 0, 0)
  return x
}

function buildMonthCells(viewMonth: Date): (Date | null)[] {
  const first = startOfMonthLocal(viewMonth)
  const year = first.getFullYear()
  const month = first.getMonth()
  const daysInMonth = endOfMonthLocal(viewMonth).getDate()
  const pad = (first.getDay() + 6) % 7
  const cells: (Date | null)[] = Array.from({ length: pad }, () => null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d, 12, 0, 0, 0))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function DailyDatePicker({
  day,
  onChange,
  daysWithTimingData,
}: {
  day: Date
  onChange: (d: Date) => void
  daysWithTimingData: ReadonlySet<string>
}) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonthLocal(day))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setViewMonth(startOfMonthLocal(day))
  }, [open, day])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth])
  const today = useMemo(() => new Date(), [])
  const monthTitle = useMemo(
    () =>
      viewMonth.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      }),
    [viewMonth],
  )

  const pickDay = useCallback(
    (d: Date) => {
      onChange(d)
      setOpen(false)
    },
    [onChange],
  )

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="gs-toolbar-btn h-11 min-h-11 max-h-11 gap-1.5 px-2 font-mono text-[11px] tabular-nums"
        aria-label="选择日期"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="h-3.5 w-3.5 text-ganshale-muted" strokeWidth={1.8} />
        {toYmdLocal(day)}
      </button>

      {open ? (
        <div
          className="gs-card absolute right-0 top-full z-50 mt-1.5 w-[15.5rem] p-2 shadow-xl"
          role="dialog"
          aria-label="日历"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between gap-1 px-0.5">
            <button
              type="button"
              className="rounded-md p-1 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
              aria-label="上一月"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <span className="text-[11px] font-medium text-ganshale-text">{monthTitle}</span>
            <button
              type="button"
              className="rounded-md p-1 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
              aria-label="下一月"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-ganshale-subtle">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="py-0.5 font-medium">
                {w}
              </span>
            ))}
          </div>

          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell) {
                return <span key={`empty-${i}`} className="h-7" aria-hidden />
              }
              const ymd = toYmdLocal(cell)
              const hasData = daysWithTimingData.has(ymd)
              const selected = isSameLocalCalendarDay(cell, day)
              const isToday = isSameLocalCalendarDay(cell, today)
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => pickDay(cell)}
                  className={[
                    'flex h-7 items-center justify-center rounded-md text-[11px] tabular-nums transition',
                    selected
                      ? 'bg-slate-900 font-semibold text-white shadow-sm'
                      : hasData
                        ? 'font-semibold text-sky-700 hover:bg-sky-50'
                        : 'text-ganshale-text hover:bg-slate-100',
                    !selected && isToday ? 'ring-1 ring-sky-400/60 ring-inset' : '',
                  ].join(' ')}
                  aria-label={`${ymd}${hasData ? '，有计时数据' : ''}`}
                  aria-pressed={selected}
                >
                  {cell.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
