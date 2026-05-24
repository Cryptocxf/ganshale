import { formatDurationHmsZh } from './aggregations'
import { buildMonthlyInsights } from './monthlyInsights'
import type { MonthlySummary } from './monthlyWorktime'
import { formatMonthPickerLabel } from './monthlyWorktime'

export function buildMonthlyExportMarkdown(
  monthAnchor: Date,
  summary: MonthlySummary,
): string {
  const title = formatMonthPickerLabel(monthAnchor)
  const insights = buildMonthlyInsights(summary)
  const lines: string[] = [
    `# ${title} 月报摘要`,
    '',
    `## 概览`,
    `- 总活跃时长：${formatDurationHmsZh(summary.weekBlocksTotalSeconds)}（四周累加）`,
    `- 日均时长：${formatDurationHmsZh(summary.dailyAvgSeconds)}`,
    ...(summary.peakEfficientBand
      ? [
          `- 高效时段：${summary.peakEfficientBand.displayLabel}（${formatDurationHmsZh(summary.peakEfficientBand.seconds)}，占 ${summary.peakEfficientBand.percentOfMonth}%）`,
        ]
      : []),
    `- ${summary.vsLastMonthTotal.line}`,
  ]

  if (summary.peakDay) {
    lines.push(
      `- 峰值日：${summary.peakDay.date}（${summary.peakDay.weekdayLabel}）${formatDurationHmsZh(summary.peakDay.seconds)}`,
    )
  }

  lines.push(
    `- 有效工作日：${summary.effectiveWorkDays.count} / ${summary.effectiveWorkDays.totalDays} 天`,
    '',
    `## 分类分布`,
  )

  for (const c of summary.categories) {
    const delta =
      c.vsLastMonthPercentDelta != null
        ? `（较上月 ${c.vsLastMonthPercentDelta > 0 ? '+' : ''}${c.vsLastMonthPercentDelta}%）`
        : ''
    lines.push(
      `- ${c.label}：${formatDurationHmsZh(c.seconds)}，${c.percent.toFixed(1)}%${delta}`,
    )
  }

  lines.push('', `## 洞察`, ...insights.map((i) => `- ${i}`), '')
  return lines.join('\n')
}

export function downloadMonthlyExportMarkdown(
  monthAnchor: Date,
  summary: MonthlySummary,
): void {
  const body = buildMonthlyExportMarkdown(monthAnchor, summary)
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const key = summary.monthKey
  a.href = url
  a.download = `ganshale-monthly-${key}.md`
  a.click()
  URL.revokeObjectURL(url)
}
