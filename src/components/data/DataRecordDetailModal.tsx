import { Check, Copy, FileText, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { DataRecordRow } from '../../lib/dataRecordsQuery'
import { formatDuration } from '../../lib/aggregations'
import { formatDatetimeZhWithWeekday } from '../../lib/timeutil'
import { AppBrandIcon } from '../AppBrandIcon'
import { DashboardModalRoot } from '../DashboardModalRoot'
import { DashboardSectionTitle } from '../DashboardSectionTitle'
import { MarkdownContent } from '../MarkdownContent'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
  GS_MODAL_INSET_PANEL_CLASS,
} from '../dashboardLayout'

const REPORT_KIND_LABEL: Record<string, string> = {
  daily: '每日日报',
  weekly: '每周周报',
  monthly: '每月月报',
}

export function DataRecordDetailModal({
  row,
  onClose,
}: {
  row: DataRecordRow | null
  onClose: () => void
}) {
  const [copyBusy, setCopyBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!row) setCopied(false)
  }, [row])

  const handleCopyReport = useCallback(async () => {
    const body = row?.reportText?.trim() ?? ''
    if (!body) return
    setCopyBusy(true)
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    } finally {
      setCopyBusy(false)
    }
  }, [row?.reportText])

  if (!row) return null
  const start = new Date(row.startMs)
  const end = new Date(row.startMs + row.durationSec * 1000)
  const isReport = row.recordKind !== 'window'
  const reportBody = row.reportText?.trim() ?? ''
  const reportLabel = REPORT_KIND_LABEL[row.recordKind] ?? '报表'

  if (isReport) {
    return (
      <DashboardModalRoot
        open
        onClose={onClose}
        labelledBy="data-record-detail-title"
        overlayClassName="items-start overflow-y-auto pt-[min(10vh,4rem)] sm:pt-[min(12vh,5rem)]"
        dialogClassName={`${DASHBOARD_DETAIL_MODAL_SIZE_CLASS} max-w-2xl shrink-0`}
      >
        <header
          className={`flex shrink-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
        >
          <DashboardSectionTitle id="data-record-detail-title" icon={FileText}>
            {reportLabel} · {row.dateYmd}
          </DashboardSectionTitle>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={copyBusy || !reportBody}
              onClick={() => void handleCopyReport()}
              className={[
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
                copied
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : DASHBOARD_HEADER_ACTION_BTN_CLASS,
              ].join(' ')}
            >
              {copied ? (
                <Check className="h-3 w-3" strokeWidth={2} />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={1.8} />
              )}
              {copied ? '已复制' : '复制正文'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-ganshale-muted hover:bg-ganshale-page hover:text-ganshale-text"
              aria-label="关闭"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </header>
        <section className={`${DASHBOARD_DETAIL_MODAL_BODY_CLASS} space-y-3`}>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <DetailMeta label="生成时间" value={formatDatetimeZhWithWeekday(start)} />
            <DetailMeta label="所属日期" value={row.dateYmd} />
          </dl>
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ganshale-subtle">
              正文
            </p>
            <div
              className={`${GS_MODAL_INSET_PANEL_CLASS} max-h-[min(52vh,24rem)] overflow-y-auto px-3 py-2.5 text-[11px] leading-relaxed text-ganshale-text`}
            >
              {reportBody ? (
                <MarkdownContent source={reportBody} />
              ) : (
                <p className="text-ganshale-muted">（空）</p>
              )}
            </div>
          </div>
        </section>
      </DashboardModalRoot>
    )
  }

  return (
    <DashboardModalRoot
      open
      onClose={onClose}
      labelledBy="data-record-detail-title"
      dialogClassName="max-h-[min(88vh,28rem)] w-full max-w-md"
    >
      <header className={`flex items-center justify-between px-3 py-2 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}>
        <h3 id="data-record-detail-title" className="font-display text-xs font-semibold text-ganshale-text">
          记录详情
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-ganshale-muted hover:bg-ganshale-page hover:text-ganshale-text"
          aria-label="关闭"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-xs">
        <div className="flex items-center gap-2">
          <AppBrandIcon
            app={row.appExe}
            brandKey={row.identityKey}
            appPath={row.appPath}
            size={28}
            className="rounded-md"
          />
          <div>
            <p className="font-medium text-ganshale-text">{row.appLabel}</p>
            <p className="text-[10px] text-ganshale-muted">{row.appExe}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-2">
          <DetailRow label="开始时间" value={formatDatetimeZhWithWeekday(start)} mono />
          <DetailRow label="所属日期" value={row.dateYmd} mono />
          <DetailRow label="结束时间" value={formatDatetimeZhWithWeekday(end)} mono />
          <DetailRow label="时长" value={formatDuration(row.durationSec)} />
          <DetailRow label="分类" value={row.categoryLabel} />
          <DetailRow label="窗口标题" value={row.title || '—'} breakWords />
          {row.appPath ? <DetailRow label="应用路径" value={row.appPath} mono small /> : null}
        </dl>
      </section>
      <footer className="flex justify-end px-3 py-2">
        <button type="button" onClick={onClose} className={DASHBOARD_HEADER_ACTION_BTN_CLASS}>
          关闭
        </button>
      </footer>
    </DashboardModalRoot>
  )
}

function DetailMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-ganshale-subtle">{label}</dt>
      <dd className="mt-0.5 font-mono text-ganshale-text">{value}</dd>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  small,
  breakWords,
}: {
  label: string
  value: string
  mono?: boolean
  small?: boolean
  breakWords?: boolean
}) {
  return (
    <div>
      <dt className="text-ganshale-subtle">{label}</dt>
      <dd
        className={[
          'mt-0.5 text-ganshale-text',
          mono ? 'font-mono' : '',
          small ? 'break-all text-[10px] text-ganshale-muted' : '',
          breakWords ? 'whitespace-pre-wrap break-words' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
