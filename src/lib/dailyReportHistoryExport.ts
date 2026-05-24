import * as XLSX from 'xlsx'
import {
  sortDailyReportHistoryByTimeAsc,
  type DailyReportHistoryEntry,
} from './dailyReportHistoryStore'
import { formatDatetimeZh } from './timeutil'

export function exportDailyReportHistoryExcel(dayYmd: string, entries: DailyReportHistoryEntry[]) {
  const rows: (string | number)[][] = [['序号', '输出文本', '输出时间']]
  const sorted = sortDailyReportHistoryByTimeAsc(entries)
  sorted.forEach((e, i) => {
    rows.push([i + 1, e.text, formatDatetimeZh(new Date(e.createdAt))])
  })
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 6 }, { wch: 72 }, { wch: 22 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '日报')
  XLSX.writeFile(wb, `日报记录-${dayYmd}.xlsx`)
}
