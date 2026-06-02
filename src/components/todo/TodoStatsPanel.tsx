import type { TodoViewStats, TodoViewTab } from '../../lib/todoView'

export function TodoStatsPanel({ tab, stats }: { tab: TodoViewTab; stats: TodoViewStats }) {
  const progressLabel =
    tab === 'today'
      ? '今日进度'
      : tab === 'week'
        ? '本周进度'
        : tab === 'month'
          ? '本月进度'
          : '年度进度'

  const deltaText =
    stats.deltaVsYesterday != null
      ? stats.deltaVsYesterday >= 0
        ? `较昨日 +${stats.deltaVsYesterday}`
        : `较昨日 ${stats.deltaVsYesterday}`
      : null

  return (
    <section className="shrink-0 space-y-3" aria-label="数据统计">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="todo-stat-card px-3 py-2.5">
          <p className="text-[11px] font-medium text-ganshale-muted">总任务</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ganshale-text">{stats.total}</p>
          {deltaText ? (
            <p className="mt-0.5 text-[10px] text-ganshale-subtle">{deltaText}</p>
          ) : (
            <p className="mt-0.5 text-[10px] text-transparent">—</p>
          )}
        </div>
        <div className="todo-stat-card px-3 py-2.5">
          <p className="text-[11px] font-medium text-ganshale-muted">已完成</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ganshale-text">{stats.completed}</p>
          <p className="mt-0.5 text-[10px] text-ganshale-subtle">完成率 {stats.completionRate}%</p>
        </div>
        <div className="todo-stat-card px-3 py-2.5">
          <p className="text-[11px] font-medium text-ganshale-muted">进行中</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ganshale-text">{stats.inProgress}</p>
          <p className="mt-0.5 text-[10px] text-ganshale-subtle">
            {stats.overdueCount > 0 ? `${stats.overdueCount} 项逾期` : `${stats.pending} 项待处理`}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium text-ganshale-muted">{progressLabel}</span>
          <span className="tabular-nums text-ganshale-text">
            {stats.completed} / {stats.total}
          </span>
        </div>
        <div className="todo-progress-track" role="progressbar" aria-valuenow={stats.completionRate} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="todo-progress-fill"
            style={{ width: `${stats.total > 0 ? stats.completionRate : 0}%` }}
          />
        </div>
      </div>
    </section>
  )
}
