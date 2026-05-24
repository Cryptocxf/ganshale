import { Copy, FileSpreadsheet, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
  GS_MODAL_INSET_PANEL_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  loadMonthlyReportHistory,
  removeMonthlyReportHistoryEntry,
  sortMonthlyReportHistoryByTimeAsc,
  MONTHLY_REPORT_HISTORY_CHANGED_EVENT,
  type MonthlyReportHistoryEntry,
} from '../lib/monthlyReportHistoryStore'
import { formatDatetimeZh } from '../lib/timeutil'
import { formatMonthPickerLabel } from '../lib/monthlyWorktime'
import { MarkdownContent } from './MarkdownContent'

function ReportTextCell({ text }: { text: string }) {
  return (
    <div className="gs-dashboard-modal__inset min-w-[12rem] max-h-32 overflow-y-auto rounded-md px-2 py-1.5 text-left text-[11px] leading-relaxed text-ganshale-text">
      {text.trim() ? (
        <MarkdownContent source={text} />
      ) : (
        <p className="text-ganshale-muted">（空）</p>
      )}
    </div>
  )
}

function HistoryRowActions({
  text,
  onDelete,
}: {
  text: string
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [copyHint, setCopyHint] = useState<string | null>(null)

  const showCopyHint = useCallback((msg: string) => {
    setCopyHint(msg)
    window.setTimeout(() => setCopyHint(null), 2000)
  }, [])

  const handleCopy = useCallback(async () => {
    const body = text.trim()
    if (!body) {
      showCopyHint('暂无内容可复制')
      return
    }
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      showCopyHint('复制成功')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showCopyHint('复制失败')
    }
  }, [text, showCopyHint])

  return (
    <div className="flex items-center justify-center gap-0.5">
      <div className="relative flex flex-col items-center">
        {copyHint ? (
          <span
            className="pointer-events-none absolute bottom-full mb-0.5 whitespace-nowrap rounded bg-ganshale-text px-1.5 py-0.5 text-[9px] font-medium leading-tight text-white shadow-sm"
            role="status"
          >
            {copyHint}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={[
            'rounded p-1 transition',
            copied
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-ganshale-muted hover:bg-ganshale-page hover:text-ganshale-text',
          ].join(' ')}
          title="复制"
          aria-label="复制本条输出"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 text-ganshale-muted transition hover:bg-red-50 hover:text-red-600"
        title="删除"
        aria-label="删除本条记录"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  )
}

export function MonthlyReportHistoryModal({
  open,
  monthAnchor,
  onClose,
}: {
  open: boolean
  monthAnchor: Date
  onClose: () => void
  onCopyToast?: (msg: string | null) => void
}) {
  const [entries, setEntries] = useState<MonthlyReportHistoryEntry[]>(() =>
    loadMonthlyReportHistory(monthAnchor),
  )

  const sortedEntries = useMemo(
    () => sortMonthlyReportHistoryByTimeAsc(entries),
    [entries],
  )

  const reload = useCallback(() => {
    setEntries(loadMonthlyReportHistory(monthAnchor))
  }, [monthAnchor])

  useEffect(() => {
    if (!open) return
    reload()
    const onChange = () => reload()
    window.addEventListener(MONTHLY_REPORT_HISTORY_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(MONTHLY_REPORT_HISTORY_CHANGED_EVENT, onChange)
  }, [open, reload])

  const handleDelete = useCallback(
    (id: string) => {
      removeMonthlyReportHistoryEntry(monthAnchor, id)
      reload()
    },
    [monthAnchor, reload],
  )

  if (!open) return null

  const label = formatMonthPickerLabel(monthAnchor)
  const monthKey = `${monthAnchor.getFullYear()}-${String(monthAnchor.getMonth() + 1).padStart(2, '0')}`

  return (
    <DashboardModalRoot
      open
      onClose={onClose}
      zIndex={95}
      labelledBy="monthly-report-history-title"
      overlayClassName="items-start overflow-y-auto pt-[min(8vh,3.5rem)] sm:pt-[min(10vh,4rem)]"
      dialogClassName={`${DASHBOARD_DETAIL_MODAL_SIZE_CLASS} max-w-5xl shrink-0`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
      >
        <DashboardSectionTitle id="monthly-report-history-title" icon={FileSpreadsheet}>
          月报记录 · {monthKey}
        </DashboardSectionTitle>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className={[DASHBOARD_DETAIL_MODAL_BODY_CLASS, 'px-1 py-1 sm:px-2 sm:py-2'].join(' ')}>
        <p className="mb-2 px-2 text-[10px] text-ganshale-muted">{label}</p>
        {sortedEntries.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-ganshale-muted">
            暂无月报记录。请点击「生成月报」生成后在此查看。
          </p>
        ) : (
          <div className={`max-h-[min(70vh,640px)] overflow-auto ${GS_MODAL_INSET_PANEL_CLASS}`}>
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <thead className="gs-dashboard-modal__table-head sticky top-0 z-[1]">
                <tr>
                  <th className="w-12 px-2 py-2 text-center text-[11px] font-medium text-ganshale-text">
                    序号
                  </th>
                  <th className="min-w-[14rem] px-2 py-2 text-[11px] font-medium text-ganshale-text">
                    输出文本
                  </th>
                  <th className="w-[11.5rem] shrink-0 px-2 py-2 text-center text-[11px] font-medium text-ganshale-text">
                    输出时间
                  </th>
                  <th className="w-16 shrink-0 px-2 py-2 text-center text-[11px] font-medium text-ganshale-text">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="gs-dashboard-modal__table-body divide-y divide-ganshale-border">
                {sortedEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className="align-middle px-2 py-2 text-center text-[11px] tabular-nums text-ganshale-muted">
                      {index + 1}
                    </td>
                    <td className="align-top px-2 py-2">
                      <ReportTextCell text={entry.text} />
                    </td>
                    <td className="align-middle px-2 py-2 text-center text-[10px] tabular-nums leading-relaxed text-ganshale-muted whitespace-nowrap">
                      {formatDatetimeZh(new Date(entry.createdAt))}
                    </td>
                    <td className="align-middle px-2 py-2">
                      <HistoryRowActions
                        text={entry.text}
                        onDelete={() => handleDelete(entry.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardModalRoot>
  )
}
