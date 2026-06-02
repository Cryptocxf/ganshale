import { useMemo, useState } from 'react'
import { useTodoClockMs, useTodos } from '../hooks/useTodos'
import { computeTodoViewStats, type TodoViewTab } from '../lib/todoView'
import { TodoCreateModal } from './todo/TodoCreateModal'
import { TodoPageHeader } from './todo/TodoPageHeader'
import { TodoStatsPanel } from './todo/TodoStatsPanel'
import { TodoTaskGroupList } from './todo/TodoTaskGroupList'
import { TodoViewTabs } from './todo/TodoViewTabs'

export function TodoDashboard() {
  const items = useTodos()
  const nowMs = useTodoClockMs()
  const [tab, setTab] = useState<TodoViewTab>('today')
  const [createOpen, setCreateOpen] = useState(false)

  const stats = useMemo(
    () => computeTodoViewStats(items, tab, nowMs),
    [items, tab, nowMs],
  )

  return (
    <div className="todo-page flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--todo-page-bg)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        <TodoPageHeader onNew={() => setCreateOpen(true)} />

        <div className="mt-4">
          <TodoViewTabs tab={tab} onChange={setTab} />
        </div>

        <div className="mt-4">
          <TodoStatsPanel tab={tab} stats={stats} />
        </div>

        <div className="mt-5 min-h-0 flex-1 pb-4">
          <TodoTaskGroupList items={items} tab={tab} nowMs={nowMs} />
        </div>
      </div>

      <TodoCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
