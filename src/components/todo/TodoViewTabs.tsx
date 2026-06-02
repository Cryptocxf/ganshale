import { TODO_VIEW_TABS, type TodoViewTab } from '../../lib/todoView'

export function TodoViewTabs({
  tab,
  onChange,
}: {
  tab: TodoViewTab
  onChange: (tab: TodoViewTab) => void
}) {
  return (
    <nav
      className="flex shrink-0 gap-6 border-b border-ganshale-border"
      aria-label="待办范围"
    >
      {TODO_VIEW_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          className={['todo-tab', tab === t.id ? 'todo-tab--active' : ''].join(' ')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
