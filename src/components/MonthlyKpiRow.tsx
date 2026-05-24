import { CalendarCheck, Flame, Timer, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MonthlyLiveKpi, MonthlySummary } from '../lib/monthlyWorktime'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { formatHoursCompact, formatMonthDayShort } from '../lib/monthlyWorktime'
import type { WeekCompareTone } from '../lib/weeklyWorktime'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { OfficeDurationHmsDisplay } from './OfficeDurationHmsDisplay'
import { MONTHLY_KPI_SECTION_CLASS } from './dashboardLayout'

const COMPARE_TONE_CLASS: Record<WeekCompareTone, string> = {
  up: 'text-red-600',
  down: 'text-emerald-600',
  flat: 'text-ganshale-muted',
  none: 'text-ganshale-muted',
}

function KpiCard({
  icon,
  label,
  description,
  children,
  sub,
}: {
  icon: LucideIcon
  label: string
  description?: string | readonly string[]
  children: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden p-2 sm:p-2.5">
      <div className="shrink-0">
        <DashboardSectionTitle icon={icon} description={description}>
          {label}
        </DashboardSectionTitle>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1 text-center">
        {children}
      </div>
      {sub ? <div className="shrink-0 pb-0.5 text-center">{sub}</div> : null}
    </div>
  )
}

export function MonthlyKpiRow({
  summary,
  liveKpi,
}: {
  summary: MonthlySummary
  liveKpi?: MonthlyLiveKpi
}) {
  const weekBlocksTotalSeconds =
    liveKpi?.weekBlocksTotalSeconds ?? summary.weekBlocksTotalSeconds
  const vsLastMonthWeekBlocksTotal =
    liveKpi?.vsLastMonthWeekBlocksTotal ?? summary.vsLastMonthWeekBlocksTotal
  const liveTotal = liveKpi?.live ?? false
  const { peakDay, peakEfficientBand, effectiveWorkDays } = summary
  const CompareIcon =
    vsLastMonthWeekBlocksTotal.tone === 'up'
      ? TrendingUp
      : vsLastMonthWeekBlocksTotal.tone === 'down'
        ? TrendingDown
        : null

  return (
    <div className={MONTHLY_KPI_SECTION_CLASS}>
      <KpiCard
        icon={Timer}
        label="本月总活跃"
        description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyTotalActive}
        sub={
          <p
            className={[
              'flex items-center justify-center gap-1 text-[11px] font-medium',
              COMPARE_TONE_CLASS[vsLastMonthWeekBlocksTotal.tone],
            ].join(' ')}
          >
            {CompareIcon ? (
              <CompareIcon className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : null}
            {vsLastMonthWeekBlocksTotal.line}
          </p>
        }
      >
        <OfficeDurationHmsDisplay
          totalSec={weekBlocksTotalSeconds}
          size="sm"
          live={liveTotal}
        />
      </KpiCard>

      <KpiCard
        icon={Zap}
        label="高效时段"
        description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyPeakEfficientBand}
        sub={
          peakEfficientBand ? (
            <p className="text-[11px] text-ganshale-muted">
              活跃 {formatHoursCompact(peakEfficientBand.seconds)} · 占本月{' '}
              {peakEfficientBand.percentOfMonth}%
            </p>
          ) : (
            <p className="text-[11px] text-ganshale-muted">暂无数据</p>
          )
        }
      >
        {peakEfficientBand ? (
          <p className="gs-duration-num gs-duration-num--sm whitespace-nowrap">
            {peakEfficientBand.displayLabel}
          </p>
        ) : (
          <p className="gs-duration-num gs-duration-num--sm text-ganshale-muted">—</p>
        )}
      </KpiCard>

      <KpiCard
        icon={Flame}
        label="峰值日"
        description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyPeakDay}
        sub={
          peakDay ? (
            <p className="text-[11px] text-ganshale-muted">
              {formatMonthDayShort(peakDay.date)} {peakDay.weekdayLabel}
            </p>
          ) : (
            <p className="text-[11px] text-ganshale-muted">暂无峰值</p>
          )
        }
      >
        {peakDay ? (
          <OfficeDurationHmsDisplay totalSec={peakDay.seconds} size="sm" />
        ) : (
          <p className="gs-duration-num gs-duration-num--sm text-ganshale-muted">—</p>
        )}
      </KpiCard>

      <KpiCard
        icon={CalendarCheck}
        label="有效工作日"
        description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyEffectiveWorkDays}
        sub={
          <p className="text-[11px] text-ganshale-muted">单日 ≥1 小时</p>
        }
      >
        <p className="flex flex-wrap items-baseline justify-center gap-x-1.5">
          <span className="gs-duration-num gs-duration-num--sm">{effectiveWorkDays.count}</span>
          <span className="text-[11px] font-medium text-ganshale-muted">
            / {effectiveWorkDays.totalDays} 天
          </span>
        </p>
      </KpiCard>
    </div>
  )
}
