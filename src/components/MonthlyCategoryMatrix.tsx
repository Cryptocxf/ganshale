import { LayoutGrid } from 'lucide-react'
import { formatDuration } from '../lib/aggregations'
import type { MonthlySummary } from '../lib/monthlyWorktime'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP } from './dashboardLayout'

function deltaLabel(pct: number | null): string {
  if (pct == null) return '—'
  if (pct === 0) return '0%'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function deltaClass(pct: number | null): string {
  if (pct == null || pct === 0) return 'text-ganshale-muted'
  return pct > 0 ? 'text-red-600' : 'text-emerald-600'
}

export function MonthlyCategoryMatrix({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className={[DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP, 'shrink-0'].join(' ')}>
        <DashboardSectionTitle
          icon={LayoutGrid}
          description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyCategoryMatrix}
        >
          分类矩阵
        </DashboardSectionTitle>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 sm:px-3">
        {summary.categories.length === 0 ? (
          <p className="text-xs text-ganshale-muted">本月暂无分类数据</p>
        ) : (
          <ul className="space-y-2.5">
            {summary.categories.map((row) => (
              <li key={row.categoryId}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-ganshale-text">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ganshale-muted">
                    {row.percent.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ganshale-track">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${Math.min(100, row.percent)}%`, backgroundColor: row.color }}
                  />
                </div>
                <div className="mt-0.5 flex justify-between text-[10px] tabular-nums">
                  <span className="text-ganshale-muted">{formatDuration(row.seconds)}</span>
                  <span className={deltaClass(row.vsLastMonthPercentDelta)}>
                    较上月 {deltaLabel(row.vsLastMonthPercentDelta)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
