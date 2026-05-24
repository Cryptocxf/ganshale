import { loadDailyReportHistory } from './dailyReportHistoryStore'
import { loadWeeklyReportHistory } from './weeklyReportHistoryStore'
import { daysInLocalMonth, formatMonthPickerLabel } from './monthlyWorktime'
import {
  formatDatetimeZh,
  parseYmdLocal,
  startOfWeekMondayLocal,
  toYmdLocal,
} from './timeutil'
import { buildWorkRecordBlock, loadWorkRecords } from './workRecordStore'

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function formatWeekdayZh(d: Date): string {
  return WEEKDAY_ZH[d.getDay()] ?? '—'
}

function monthKeyFromAnchor(monthAnchor: Date): string {
  const m = new Date(monthAnchor)
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
}

/** 汇总本月每日日报、周报与工作记录 */
export function buildMonthlyReportsBlock(monthAnchor: Date): string {
  const sections: string[] = []

  sections.push('### 每日日报与工作记录')
  for (const day of daysInLocalMonth(monthAnchor)) {
    const ymd = toYmdLocal(day)
    const weekday = formatWeekdayZh(day)
    const entries = loadDailyReportHistory(day)
    const workBlock = buildWorkRecordBlock(loadWorkRecords(day))
    sections.push(`#### ${ymd}（${weekday}）`)
    if (entries.length === 0) {
      sections.push('（无已保存日报）')
    } else {
      for (const e of entries) {
        sections.push(
          `##### 日报 ${formatDatetimeZh(new Date(e.createdAt))}`,
          e.text.trim(),
          '',
        )
      }
    }
    sections.push('【当日工作记录】', workBlock, '')
  }

  const weekKeys = new Set<string>()
  for (const day of daysInLocalMonth(monthAnchor)) {
    weekKeys.add(toYmdLocal(startOfWeekMondayLocal(day)))
  }

  sections.push('### 本月周报')
  for (const key of [...weekKeys].sort()) {
    const mon = parseYmdLocal(key)
    const entries = loadWeeklyReportHistory(mon)
    sections.push(`#### 周次 ${key}（周一）`)
    if (entries.length === 0) {
      sections.push('（无已保存周报）', '')
    } else {
      for (const e of entries) {
        sections.push(
          `##### 周报 ${formatDatetimeZh(new Date(e.createdAt))}`,
          e.text.trim(),
          '',
        )
      }
    }
  }

  return sections.join('\n').trim()
}

export function buildMonthlyReportGenerationUserContent(
  monthAnchor: Date,
  prompt: string,
  gatewayModel: string,
): string {
  const key = monthKeyFromAnchor(monthAnchor)
  const label = formatMonthPickerLabel(monthAnchor)
  const generatedAt = formatDatetimeZh(new Date())
  const reportsBlock = buildMonthlyReportsBlock(monthAnchor)

  return [
    '【提示词】',
    prompt,
    '',
    '---',
    `【报告月份】${label}（${key}）`,
    `【生成时刻】${generatedAt}`,
    `【日期约束】报告 Markdown 一级标题必须且仅能写作：\`# 月报 ${key}\`。禁止编造或使用示例月份。`,
    '',
    '【本月日报、周报与工作记录汇总】',
    reportsBlock,
    '',
    `【使用模型】网关 model：${gatewayModel}`,
  ].join('\n')
}

export function normalizeMonthlyReportTitleDate(text: string, monthAnchor: Date): string {
  const key = monthKeyFromAnchor(monthAnchor)
  const title = `# 月报 ${key}`
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (/^#\s*月报\s/m.test(trimmed)) {
    return trimmed.replace(/^#\s*月报\s+.+$/m, title)
  }
  return `${title}\n\n${trimmed}`
}
