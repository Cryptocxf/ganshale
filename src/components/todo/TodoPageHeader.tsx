import { MoreHorizontal, Plus } from 'lucide-react'
import { formatTodoHeaderDate } from '../../lib/todoView'

export function TodoPageHeader({ onNew }: { onNew: () => void }) {
  const dateLine = formatTodoHeaderDate()

  return (
    <header className="flex shrink-0 items-start justify-between gap-3 pb-1">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ganshale-text sm:text-2xl">我的待办</h1>
        <p className="mt-0.5 text-xs text-ganshale-muted sm:text-[13px]">{dateLine}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="rounded-lg p-2 text-ganshale-muted transition hover:bg-ganshale-elevated hover:text-ganshale-text"
          aria-label="更多"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-1.5 text-xs font-semibold text-ganshale-text transition hover:bg-ganshale-elevated"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          新建
        </button>
      </div>
    </header>
  )
}
