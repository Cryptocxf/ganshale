import { formatClock, toYmdLocal } from './timeutil'
import type { DataRecordKind, DataRecordRow } from './dataRecordsQuery'

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeCsv(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

const EXPORT_KIND_LABEL: Record<DataRecordKind, string> = {
  window: '窗口记录',
  daily: '每日日报',
  weekly: '每周周报',
  monthly: '每月月报',
}

export function exportDataRecordsCsv(rows: DataRecordRow[], recordKind: DataRecordKind = 'window') {
  const isReport = recordKind !== 'window'
  const header = isReport
    ? ['生成时间', '所属日期', '类型', '摘要', '正文']
    : ['开始时间', '日期', '应用', '窗口标题', '时长(秒)', '分类']
  const lines = [header.join(',')]
  for (const r of rows) {
    if (isReport) {
      lines.push(
        [
          escapeCsv(formatClock(new Date(r.startMs))),
          escapeCsv(r.dateYmd),
          escapeCsv(r.appLabel),
          escapeCsv(r.title),
          escapeCsv(r.reportText?.trim() ?? ''),
        ].join(','),
      )
    } else {
      lines.push(
        [
          escapeCsv(formatClock(new Date(r.startMs))),
          escapeCsv(r.dateYmd),
          escapeCsv(r.appLabel),
          escapeCsv(r.title),
          String(r.durationSec),
          escapeCsv(r.categoryLabel),
        ].join(','),
      )
    }
  }
  downloadBlob(
    `${EXPORT_KIND_LABEL[recordKind]}-${toYmdLocal(new Date())}.csv`,
    lines.join('\n'),
    'text/csv;charset=utf-8',
  )
}
