import {
  formatWeekRangeLabel,
  parseYmdLocal,
  startOfWeekMondayLocal,
  toYmdLocal,
  WEEKDAY_ZH,
} from './timeutil'
import type { TodoItem } from './todoStore'

export type TodoHistoryPeriod = 'day' | 'week' | 'month' | 'year'

export const TODO_HISTORY_PERIOD_TABS: { id: TodoHistoryPeriod; label: string }[] = [
  { id: 'day', label: '日' },
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
]

export type TodoHistoryBucket = {
  key: string
  label: string
  sublabel?: string
  pending: TodoItem[]
  completed: TodoItem[]
}

function splitBucketItems(items: TodoItem[]): Pick<TodoHistoryBucket, 'pending' | 'completed'> {
  const pending = items.filter((t) => !t.completedAt)
  const completed = items.filter((t) => t.completedAt)
  return { pending, completed }
}

function bucketKeyForItem(item: TodoItem, period: TodoHistoryPeriod): string {
  const ymd = item.scheduledDate
  switch (period) {
    case 'day':
      return ymd
    case 'week':
      return toYmdLocal(startOfWeekMondayLocal(parseYmdLocal(ymd)))
    case 'month':
      return ymd.slice(0, 7)
    case 'year':
      return ymd.slice(0, 4)
  }
}

function bucketLabel(key: string, period: TodoHistoryPeriod): { label: string; sublabel?: string } {
  switch (period) {
    case 'day': {
      const d = parseYmdLocal(key)
      const wd = WEEKDAY_ZH[d.getDay()]
      return {
        label: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
        sublabel: wd,
      }
    }
    case 'week': {
      const monday = parseYmdLocal(key)
      return {
        label: formatWeekRangeLabel(monday),
        sublabel: `${key} 起`,
      }
    }
    case 'month': {
      const [y, m] = key.split('-')
      return { label: `${y}年${Number(m)}月` }
    }
    case 'year':
      return { label: `${key}年` }
  }
}

/** 按日 / 周 / 月 / 年分组展示全部待办（含已办与待办） */
export function buildTodoHistoryBuckets(
  items: TodoItem[],
  period: TodoHistoryPeriod,
): TodoHistoryBucket[] {
  const map = new Map<string, TodoItem[]>()
  for (const item of items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.scheduledDate)) continue
    const key = bucketKeyForItem(item, period)
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, bucketItems]) => {
      const meta = bucketLabel(key, period)
      return {
        key,
        label: meta.label,
        sublabel: meta.sublabel,
        ...splitBucketItems(bucketItems),
      }
    })
}
