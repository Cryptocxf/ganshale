import { loadDailyReportHistory } from './dailyReportHistoryStore'
import {
  daysInLocalWeek,
  formatDatetimeZh,
  formatWeekRangeLabel,
  toYmdLocal,
} from './timeutil'
import { buildWorkRecordBlock, loadWorkRecords } from './workRecordStore'

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function formatWeekdayZh(d: Date): string {
  return WEEKDAY_ZH[d.getDay()] ?? '—'
}

/** 汇总本周每日已保存的日报 + 工作记录 */
export function buildWeeklyDailyReportsBlock(weekStartMonday: Date): string {
  const lines: string[] = []
  for (const day of daysInLocalWeek(weekStartMonday)) {
    const ymd = toYmdLocal(day)
    const weekday = formatWeekdayZh(day)
    const entries = loadDailyReportHistory(day)
    const workBlock = buildWorkRecordBlock(loadWorkRecords(day))
    lines.push(`### ${ymd}（${weekday}）`)
    if (entries.length === 0) {
      lines.push('（无已保存日报）')
    } else {
      for (const e of entries) {
        lines.push(
          `#### 日报 ${formatDatetimeZh(new Date(e.createdAt))}`,
          e.text.trim(),
          '',
        )
      }
    }
    lines.push('【当日工作记录】', workBlock, '')
  }
  return lines.join('\n').trim()
}

export function buildWeeklyReportGenerationUserContent(
  weekStartMonday: Date,
  prompt: string,
  gatewayModel: string,
): string {
  const weekStart = toYmdLocal(weekStartMonday)
  const range = formatWeekRangeLabel(weekStartMonday)
  const generatedAt = formatDatetimeZh(new Date())
  const dailyBlock = buildWeeklyDailyReportsBlock(weekStartMonday)

  return [
    '【提示词】',
    prompt,
    '',
    '---',
    `【报告周次】${weekStart} 起的一周（${range}）`,
    `【生成时刻】${generatedAt}`,
    `【日期约束】报告 Markdown 一级标题必须且仅能写作：\`# 周报 ${weekStart}\`（周一日期）。禁止编造或使用示例周次。`,
    '',
    '【本周每日工作记录汇总】',
    dailyBlock,
    '',
    `【使用模型】网关 model：${gatewayModel}`,
  ].join('\n')
}

export function normalizeWeeklyReportTitleDate(
  text: string,
  weekStartMonday: Date,
): string {
  const ymd = toYmdLocal(weekStartMonday)
  const title = `# 周报 ${ymd}`
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (/^#\s*周报\s/m.test(trimmed)) {
    return trimmed.replace(/^#\s*周报\s+.+$/m, title)
  }
  return `${title}\n\n${trimmed}`
}
