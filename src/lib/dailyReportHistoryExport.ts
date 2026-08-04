import {
  sortDailyReportHistoryByTimeAsc,
  type DailyReportHistoryEntry,
} from './dailyReportHistoryStore'
import { formatDatetimeZh } from './timeutil'

export async function exportDailyReportHistoryExcel(
  dayYmd: string,
  entries: DailyReportHistoryEntry[],
): Promise<void> {
  const { Workbook } = await import('exceljs')
  const rows: (string | number)[][] = [['序号', '输出文本', '输出时间']]
  const sorted = sortDailyReportHistoryByTimeAsc(entries)
  sorted.forEach((e, i) => {
    rows.push([i + 1, e.text, formatDatetimeZh(new Date(e.createdAt))])
  })
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet('日报')
  worksheet.addRows(rows)
  worksheet.columns = [{ width: 6 }, { width: 72 }, { width: 22 }]
  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `日报记录-${dayYmd}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
