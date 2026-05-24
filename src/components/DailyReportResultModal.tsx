import { Check, Copy, Download, FileText, Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { MarkdownContent } from './MarkdownContent'
import { toYmdLocal } from '../lib/timeutil'

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function DailyReportResultModal({
  open,
  day,
  text,
  streaming,
  reportStreamingEmpty,
  onClose,
  onCopyToast,
}: {
  open: boolean
  day: Date
  text: string
  streaming: boolean
  reportStreamingEmpty: boolean
  onClose: () => void
  onCopyToast: (msg: string | null) => void
}) {
  const [copyBusy, setCopyBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const handleCopy = useCallback(async () => {
    const body = text.trim()
    if (!body) {
      onCopyToast('暂无内容可复制')
      window.setTimeout(() => onCopyToast(null), 2500)
      return
    }
    setCopyBusy(true)
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      onCopyToast('已复制')
      window.setTimeout(() => {
        setCopied(false)
        onCopyToast(null)
      }, 2000)
    } catch {
      onCopyToast('复制失败，请手动选择文本')
      window.setTimeout(() => onCopyToast(null), 2500)
    } finally {
      setCopyBusy(false)
    }
  }, [text, onCopyToast])

  const handleExport = useCallback(() => {
    const body = text.trim()
    if (!body) {
      onCopyToast('暂无内容可导出')
      window.setTimeout(() => onCopyToast(null), 2500)
      return
    }
    downloadTextFile(`日报-${toYmdLocal(day)}.txt`, body)
    onCopyToast('已导出 TXT')
    window.setTimeout(() => onCopyToast(null), 2500)
  }, [text, day, onCopyToast])

  if (!open) return null

  const hasText = Boolean(text.trim())
  const showSpinner = streaming && reportStreamingEmpty

  return (
    <DashboardModalRoot
      open
      onClose={onClose}
      zIndex={95}
      enterAnimation
      labelledBy="daily-report-result-title"
      overlayClassName="items-start overflow-y-auto pt-[min(10vh,4rem)] sm:pt-[min(12vh,5rem)]"
      dialogClassName={`${DASHBOARD_DETAIL_MODAL_SIZE_CLASS} max-w-2xl shrink-0`}
    >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
        >
          <DashboardSectionTitle id="daily-report-result-title" icon={FileText}>
            日报
          </DashboardSectionTitle>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={copyBusy || !hasText}
              onClick={() => void handleCopy()}
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
              {copied ? '已复制' : '复制'}
            </button>
            <button
              type="button"
              disabled={!hasText}
              onClick={handleExport}
              className={`${DASHBOARD_HEADER_ACTION_BTN_CLASS} inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Download className="h-3 w-3" strokeWidth={1.8} />
              导出 TXT
            </button>
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

        <div
          className={[
            DASHBOARD_DETAIL_MODAL_BODY_CLASS,
            'flex flex-col items-stretch justify-start px-2 py-2 text-left sm:px-3 sm:py-3',
          ].join(' ')}
        >
          {showSpinner ? (
            <p className="flex items-center gap-2 text-sm text-ganshale-muted">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              正在生成日报…
            </p>
          ) : hasText || streaming ? (
            <MarkdownContent source={text} />
          ) : (
            <p className="text-sm text-ganshale-muted">
              暂无日报内容。请点击顶栏「生成日报」，将根据今日工作记录与提示词生成。
            </p>
          )}
        </div>
    </DashboardModalRoot>
  )
}
