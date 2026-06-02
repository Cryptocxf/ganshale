import {
  daysInLocalWeek,
  startOfMonthLocal,
  startOfWeekMondayLocal,
  toYmdLocal,
  WEEKDAY_ZH,
} from './timeutil'

export type TodoPeriod = 'week' | 'month' | 'quarter' | 'year'

export type TodoCalendarCell = {
  key: string
  label: string
  sublabel?: string
  /** 单日待办归属（周/月格） */
  dateYmd?: string
  /** 月维度：该月内所有 `YYYY-MM` 前缀匹配 */
  monthPrefix?: string
  isToday?: boolean
}

export const TODO_PERIOD_META: Record<
  TodoPeriod,
  { tooltip: string; title: string }
> = {
  week: { tooltip: '本周待办', title: '本周' },
  month: { tooltip: '本月待办', title: '本月' },
  quarter: { tooltip: '本季度待办', title: '季度' },
  year: { tooltip: '本年度待办', title: '本年度' },
}

function daysInMonthCount(anchor: Date): number {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
}

export function buildWeekCells(anchor = new Date()): TodoCalendarCell[] {
  const weekStart = startOfWeekMondayLocal(anchor)
  const todayYmd = toYmdLocal(new Date())
  return daysInLocalWeek(weekStart).map((day) => {
    const ymd = toYmdLocal(day)
    return {
      key: ymd,
      dateYmd: ymd,
      label: `${day.getDate()}`,
      sublabel: WEEKDAY_ZH[day.getDay()],
      isToday: ymd === todayYmd,
    }
  })
}

export function buildMonthCells(anchor = new Date()): TodoCalendarCell[] {
  const monthStart = startOfMonthLocal(anchor)
  const count = daysInMonthCount(anchor)
  const todayYmd = toYmdLocal(new Date())
  const cells: TodoCalendarCell[] = []
  for (let d = 1; d <= count; d++) {
    const day = new Date(monthStart.getFullYear(), monthStart.getMonth(), d, 12, 0, 0, 0)
    const ymd = toYmdLocal(day)
    cells.push({
      key: ymd,
      dateYmd: ymd,
      label: `${d}`,
      sublabel: WEEKDAY_ZH[day.getDay()].replace('周', ''),
      isToday: ymd === todayYmd,
    })
  }
  return cells
}

export function buildQuarterCells(anchor = new Date()): TodoCalendarCell[] {
  const y = anchor.getFullYear()
  const q = Math.floor(anchor.getMonth() / 3)
  const startMonth = q * 3
  const todayYmd = toYmdLocal(new Date())
  return Array.from({ length: 3 }, (_, i) => {
    const month = startMonth + i
    const day = new Date(y, month, 1, 12, 0, 0, 0)
    const prefix = `${y}-${String(month + 1).padStart(2, '0')}`
    const ymd = toYmdLocal(day)
    return {
      key: prefix,
      monthPrefix: prefix,
      dateYmd: ymd,
      label: `${month + 1}月`,
      sublabel: `${y}年 Q${q + 1}`,
      isToday: todayYmd.startsWith(prefix),
    }
  })
}

export function buildYearCells(anchor = new Date()): TodoCalendarCell[] {
  const y = anchor.getFullYear()
  const todayYmd = toYmdLocal(new Date())
  return Array.from({ length: 12 }, (_, month) => {
    const day = new Date(y, month, 1, 12, 0, 0, 0)
    const prefix = `${y}-${String(month + 1).padStart(2, '0')}`
    const ymd = toYmdLocal(day)
    return {
      key: prefix,
      monthPrefix: prefix,
      dateYmd: ymd,
      label: `${month + 1}月`,
      sublabel: `${y}`,
      isToday: todayYmd.startsWith(prefix),
    }
  })
}

export function buildCalendarCells(period: TodoPeriod, anchor = new Date()): TodoCalendarCell[] {
  switch (period) {
    case 'week':
      return buildWeekCells(anchor)
    case 'month':
      return buildMonthCells(anchor)
    case 'quarter':
      return buildQuarterCells(anchor)
    case 'year':
      return buildYearCells(anchor)
  }
}

export function periodRangeLabel(period: TodoPeriod, anchor = new Date()): string {
  const y = anchor.getFullYear()
  const m = anchor.getMonth() + 1
  switch (period) {
    case 'week': {
      const start = startOfWeekMondayLocal(anchor)
      const end = daysInLocalWeek(start)[6]
      return `${toYmdLocal(start)} — ${toYmdLocal(end)}`
    }
    case 'month':
      return `${y}年${m}月 · ${daysInMonthCount(anchor)} 天`
    case 'quarter': {
      const q = Math.floor(anchor.getMonth() / 3) + 1
      return `${y}年 第${q}季度`
    }
    case 'year':
      return `${y}年`
  }
}

export function gridClassForPeriod(period: TodoPeriod): string {
  switch (period) {
    case 'week':
      return 'grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7'
    case 'month':
      return 'grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-7 md:gap-2'
    case 'quarter':
      return 'grid grid-cols-1 gap-2 sm:grid-cols-3'
    case 'year':
      return 'grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6'
  }
}

export function matchesCell(
  item: { scheduledDate: string },
  cell: TodoCalendarCell,
  period: TodoPeriod,
): boolean {
  if (period === 'week' || period === 'month') {
    return item.scheduledDate === cell.dateYmd
  }
  if (cell.monthPrefix) {
    return item.scheduledDate.startsWith(cell.monthPrefix)
  }
  return false
}

/** 待办是否落在当前周期（周 / 月 / 季 / 年）内 */
export function isTodoInPeriod(
  item: { scheduledDate: string },
  period: TodoPeriod,
  anchor = new Date(),
): boolean {
  const ymd = item.scheduledDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false

  switch (period) {
    case 'week': {
      const start = toYmdLocal(startOfWeekMondayLocal(anchor))
      const end = toYmdLocal(daysInLocalWeek(startOfWeekMondayLocal(anchor))[6])
      return ymd >= start && ymd <= end
    }
    case 'month': {
      const prefix = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`
      return ymd.startsWith(prefix)
    }
    case 'quarter': {
      const y = anchor.getFullYear()
      const qStartMonth = Math.floor(anchor.getMonth() / 3) * 3
      const d = new Date(ymd + 'T12:00:00')
      return d.getFullYear() === y && d.getMonth() >= qStartMonth && d.getMonth() < qStartMonth + 3
    }
    case 'year':
      return ymd.startsWith(`${anchor.getFullYear()}-`)
  }
}
