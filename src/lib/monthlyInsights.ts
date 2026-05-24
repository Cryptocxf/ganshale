import { formatDurationHmsZh } from './aggregations'
import type { MonthlySummary } from './monthlyWorktime'
import { formatMonthDayShort } from './monthlyWorktime'

export function buildMonthlyInsights(summary: MonthlySummary): string[] {
  const lines: string[] = []
  const {
    effectiveWorkDays,
    categories,
    topApps,
    peakDay,
    peakEfficientBand,
    vsLastMonthWeekBlocksTotal,
  } = summary

  if (
    vsLastMonthWeekBlocksTotal.tone === 'up' &&
    vsLastMonthWeekBlocksTotal.pct != null &&
    vsLastMonthWeekBlocksTotal.pct > 10
  ) {
    lines.push(`本月总活跃时长较上月约 +${vsLastMonthWeekBlocksTotal.pct}%`)
  } else if (
    vsLastMonthWeekBlocksTotal.tone === 'down' &&
    vsLastMonthWeekBlocksTotal.pct != null &&
    vsLastMonthWeekBlocksTotal.pct < -10
  ) {
    lines.push(`本月总活跃时长低于上月约 ${Math.abs(vsLastMonthWeekBlocksTotal.pct)}%`)
  }

  const ratio =
    effectiveWorkDays.totalDays > 0
      ? effectiveWorkDays.count / effectiveWorkDays.totalDays
      : 0
  if (ratio >= 0.75) {
    lines.push(
      `有效工作日 ${effectiveWorkDays.count} 天（≥1 小时），占本月 ${Math.round(ratio * 100)}%`,
    )
  } else if (effectiveWorkDays.count > 0) {
    lines.push(`本月有效工作日 ${effectiveWorkDays.count} 天，可尝试提高连续投入天数`)
  }

  const topCat = categories[0]
  if (topCat && topCat.percent >= 35) {
    lines.push(`「${topCat.label}」占本月 ${topCat.percent.toFixed(0)}%，为主要时间去向`)
  }

  const shifted = summary.vsLastMonthCategories
    .filter((c) => Math.abs(c.thisMonthPercent - c.lastMonthPercent) >= 8)
    .sort(
      (a, b) =>
        Math.abs(b.thisMonthPercent - b.lastMonthPercent) -
        Math.abs(a.thisMonthPercent - a.lastMonthPercent),
    )
  const biggest = shifted[0]
  if (biggest) {
    const delta = biggest.thisMonthPercent - biggest.lastMonthPercent
    const dir = delta > 0 ? '上升' : '下降'
    lines.push(
      `「${biggest.label}」占比较上月${dir} ${Math.abs(delta).toFixed(0)} 个百分点`,
    )
  }

  if (peakEfficientBand && peakEfficientBand.percentOfMonth >= 15) {
    lines.push(
      `高效时段集中在 ${peakEfficientBand.displayLabel}，占本月活跃 ${peakEfficientBand.percentOfMonth}%`,
    )
  }

  if (peakDay) {
    lines.push(
      `最活跃日为 ${formatMonthDayShort(peakDay.date)}（${peakDay.weekdayLabel}），${formatDurationHmsZh(peakDay.seconds)}`,
    )
  }

  const topApp = topApps[0]
  if (topApp) {
    lines.push(`使用最多的应用为 ${topApp.label}`)
  }

  if (lines.length === 0) {
    lines.push('本月数据量较少，持续记录后可生成更丰富的洞察')
  }

  return lines.slice(0, 5)
}
