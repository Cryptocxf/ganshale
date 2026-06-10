import { Loader2, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDeadlineLabel } from '../../lib/todoCountdown'
import {
  buildTodoHistoryBuckets,
  TODO_HISTORY_PERIOD_TABS,
  type TodoHistoryPeriod,
} from '../../lib/todoHistoryView'
import {
  nextTodoSortState,
  sortTodoItems,
  type TodoSortDirection,
  type TodoSortField,
} from '../../lib/todoSort'
import { optimizeAllTodoTitles } from '../../lib/todoTitleOptimize'
import { tagLabel, tagPillClass } from '../../lib/todoTags'
import type { TodoItem } from '../../lib/todoStore'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from '../dashboardLayout'
import { DashboardModalRoot } from '../DashboardModalRoot'
import { TodoSortToolbar } from './TodoSortHeader'
import { TodoStarsReadonly } from './TodoStarRating'

function TodoHistoryItemRow({ item }: { item: TodoItem }) {
  const done = Boolean(item.completedAt)
  return (
    <li className="rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p
          className={[
            'min-w-0 flex-1 text-sm leading-snug text-ganshale-text',
            done ? 'line-through text-ganshale-muted' : 'font-medium',
          ].join(' ')}
        >
          {item.title}
        </p>
        <span
          className={[
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            done
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-amber-500/10 text-amber-800',
          ].join(' ')}
        >
          {done ? '已办' : '待办'}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ganshale-subtle">
        <span>归属 {item.scheduledDate}</span>
        <span className="inline-flex items-center gap-1">
          优先级 <TodoStarsReadonly value={item.priority} size="sm" />
        </span>
        <span>截止 {formatDeadlineLabel(item.deadlineAt)}</span>
        {item.reminderAt ? <span>提醒 {formatDeadlineLabel(item.reminderAt)}</span> : null}
        {item.completedAt ? (
          <span>完成 {formatDeadlineLabel(item.completedAt)}</span>
        ) : null}
      </div>
      {item.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className={tagPillClass(tag)}>
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function TodoHistorySection({
  title,
  items,
  emptyHint,
}: {
  title: string
  items: TodoItem[]
  emptyHint: string
}) {
  if (items.length === 0) {
    return (
      <p className="py-1 text-[11px] text-ganshale-subtle">
        {title}：{emptyHint}
      </p>
    )
  }
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-semibold text-ganshale-muted">
        {title}
        <span className="ml-1.5 font-normal tabular-nums text-ganshale-subtle">
          {items.length} 条
        </span>
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <TodoHistoryItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}

export function TodoHistoryModal({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: TodoItem[]
}) {
  const [period, setPeriod] = useState<TodoHistoryPeriod>('day')
  const [sortField, setSortField] = useState<TodoSortField>('time')
  const [sortDirection, setSortDirection] = useState<TodoSortDirection>('asc')
  const [optimizing, setOptimizing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const onSortToggle = (field: TodoSortField) => {
    const next = nextTodoSortState(field, sortField, sortDirection)
    setSortField(next.field)
    setSortDirection(next.direction)
  }

  const buckets = useMemo(
    () => buildTodoHistoryBuckets(items, period),
    [items, period],
  )

  const sortedBuckets = useMemo(
    () =>
      buckets.map((bucket) => ({
        ...bucket,
        pending: sortTodoItems(bucket.pending, sortField, sortDirection, 'deadline'),
        completed: sortTodoItems(bucket.completed, sortField, sortDirection, 'completed'),
      })),
    [buckets, sortField, sortDirection],
  )

  const totalCount = items.length

  const runOptimize = async () => {
    if (optimizing || totalCount === 0) return
    setOptimizing(true)
    setToast(null)
    try {
      const { updated, total } = await optimizeAllTodoTitles()
      setToast(updated > 0 ? `已优化 ${updated} / ${total} 条待办` : '没有需要更新的条目')
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e))
    } finally {
      setOptimizing(false)
      window.setTimeout(() => setToast(null), 5000)
    }
  }

  return (
    <DashboardModalRoot
      open={open}
      onClose={onClose}
      dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
      labelledBy="todo-history-modal-title"
      overlayClassName="items-start overflow-y-auto py-6 sm:py-8"
    >
      <header
        className={[
          GS_MODAL_HEADER_DIVIDER_CLASS,
          'flex shrink-0 items-start justify-between gap-3 px-4 py-3 sm:px-5',
        ].join(' ')}
      >
        <div className="min-w-0">
          <h2
            id="todo-history-modal-title"
            className="font-display text-base font-semibold text-ganshale-text"
          >
            待办历史
          </h2>
          <p className="mt-0.5 text-[11px] text-ganshale-muted">
            共 {totalCount} 条 · 按日 / 周 / 月 / 年查看全部待办与已办
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={optimizing || totalCount === 0}
            onClick={() => void runOptimize()}
            className={[
              DASHBOARD_HEADER_ACTION_BTN_CLASS,
              'inline-flex items-center gap-1 border-cyan-500/30 bg-cyan-500/10 text-cyan-800 hover:bg-cyan-500/15',
            ].join(' ')}
            title="使用设置中的大模型优化全部待办文案"
          >
            {optimizing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            )}
            一键优化
          </button>
          <button
            type="button"
            onClick={onClose}
            className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav
        className="flex shrink-0 gap-6 border-b border-ganshale-border px-4 sm:px-5"
        aria-label="历史分组"
      >
        {TODO_HISTORY_PERIOD_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={period === t.id}
            className={['todo-tab', period === t.id ? 'todo-tab--active' : ''].join(' ')}
            onClick={() => setPeriod(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ganshale-border px-4 py-2 sm:px-5">
        <TodoSortToolbar
          sortField={sortField}
          sortDirection={sortDirection}
          onToggle={onSortToggle}
        />
        <p className="text-[10px] text-ganshale-subtle">
          待办按截止/归属日 · 已办按完成时间
        </p>
      </div>

      {toast ? (
        <p className="shrink-0 border-b border-ganshale-border bg-ganshale-page/80 px-4 py-2 text-xs text-ganshale-text sm:px-5">
          {toast}
        </p>
      ) : null}

      <div className={[DASHBOARD_DETAIL_MODAL_BODY_CLASS, 'min-h-0 flex-1 overflow-y-auto'].join(' ')}>
        {sortedBuckets.length === 0 ? (
          <p className="py-12 text-center text-sm text-ganshale-muted">暂无待办记录</p>
        ) : (
          <div className="space-y-6">
            {sortedBuckets.map((bucket) => (
              <section key={bucket.key} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-ganshale-text">{bucket.label}</h3>
                  {bucket.sublabel ? (
                    <p className="text-[11px] text-ganshale-subtle">{bucket.sublabel}</p>
                  ) : null}
                </div>
                <TodoHistorySection
                  title="待办"
                  items={bucket.pending}
                  emptyHint="无"
                />
                <TodoHistorySection
                  title="已办"
                  items={bucket.completed}
                  emptyHint="无"
                />
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardModalRoot>
  )
}
