import { Lightbulb } from 'lucide-react'
import { useMemo } from 'react'
import { buildMonthlyInsights } from '../lib/monthlyInsights'
import type { MonthlySummary } from '../lib/monthlyWorktime'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP } from './dashboardLayout'

export function MonthlyInsightsPanel({ summary }: { summary: MonthlySummary }) {
  const insights = useMemo(() => buildMonthlyInsights(summary), [summary])

  return (
    <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className={[DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP, 'shrink-0 pb-1'].join(' ')}>
        <DashboardSectionTitle
          icon={Lightbulb}
          description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyInsights}
        >
          智能摘要
        </DashboardSectionTitle>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        <ul className="space-y-2 text-[11px] leading-relaxed text-ganshale-text">
          {insights.map((line, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ganshale-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
