import { AppWindow, Download, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AwEvent } from '../lib/awTypes'
import { formatClock, parseIso, toYmdLocal } from '../lib/timeutil'
import {
  DASHBOARD_DETAIL_MODAL_BODY_CLASS,
  DASHBOARD_DETAIL_MODAL_SIZE_CLASS,
  DASHBOARD_HEADER_ACTION_BTN_CLASS,
  GS_FIELD_INPUT_SM_CLASS,
  GS_MODAL_FOOTER_DIVIDER_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  WINDOW_TABLE_MODAL_COLGROUP,
  WindowEventTableBody,
  WindowTableHead,
} from './windowEventTable'

const PAGE_SIZE = 25

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

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function buildWindowLogCsv(rows: AwEvent[], liveSegment: { eventId: string; seconds: number } | null): string {
  const header = ['应用', '开始', '结束', '标题', '时长(秒)']
  const lines = [header.join(',')]
  for (const ev of rows) {
    const startMs = parseIso(ev.timestamp)
    const isLive = liveSegment != null && ev.id === liveSegment.eventId
    const durationSec = isLive ? liveSegment.seconds : ev.duration
    const t0 = new Date(startMs)
    const t1 = new Date(startMs + Math.max(0, durationSec) * 1000)
    const app = String(ev.data.app ?? '').trim()
    const title = String(ev.data.title ?? '')
    lines.push(
      [
        escapeCsvCell(app.replace(/\.exe$/i, '') || '未知'),
        escapeCsvCell(formatClock(t0)),
        escapeCsvCell(formatClock(t1)),
        escapeCsvCell(title),
        String(Math.round(durationSec)),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function WindowLogModal({
  open,
  day,
  rows,
  liveSegment,
  onClose,
}: {
  open: boolean
  day: Date
  rows: AwEvent[]
  liveSegment?: { eventId: string; seconds: number } | null
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const [jumpInput, setJumpInput] = useState('1')

  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    if (!open) return
    setPage(1)
    setJumpInput('1')
  }, [open, day, total])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount))
  }, [pageCount])

  useEffect(() => {
    setJumpInput(String(page))
  }, [page])

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  const onSaveAll = useCallback(() => {
    const csv = buildWindowLogCsv(rows, liveSegment ?? null)
    downloadTextFile(`窗口记录-${toYmdLocal(day)}.csv`, csv)
  }, [rows, liveSegment, day])

  const goToPage = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(1, Math.floor(target)), pageCount)
      setPage(next)
      setJumpInput(String(next))
    },
    [pageCount],
  )

  if (!open) return null

  return (
    <DashboardModalRoot
      open
      onClose={onClose}
      labelledBy="window-log-modal-title"
      dialogClassName={DASHBOARD_DETAIL_MODAL_SIZE_CLASS}
    >
        <div
          className={`flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
        >
          <DashboardSectionTitle id="window-log-modal-title" icon={AppWindow}>
            实时窗口记录
            <span className="text-[10px] font-normal text-ganshale-muted">
              共 {total} 条
            </span>
          </DashboardSectionTitle>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onSaveAll}
              disabled={total === 0}
              className={`${DASHBOARD_HEADER_ACTION_BTN_CLASS} inline-flex items-center gap-1 disabled:opacity-40`}
            >
              <Download className="h-3 w-3" strokeWidth={2} aria-hidden />
              保存全部
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

        <div className={DASHBOARD_DETAIL_MODAL_BODY_CLASS}>
          {total === 0 ? (
            <p className="py-8 text-center text-xs text-ganshale-muted">暂无窗口记录</p>
          ) : (
            <table className="w-full table-fixed border-collapse text-left">
              {WINDOW_TABLE_MODAL_COLGROUP}
              <WindowTableHead />
              <WindowEventTableBody rows={pageRows} titleLines={2} liveSegment={liveSegment} />
            </table>
          )}
        </div>

        {total > 0 ? (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 px-2 py-2 sm:px-3 ${GS_MODAL_FOOTER_DIVIDER_CLASS}`}
          >
            <p className="text-[10px] text-ganshale-muted">
              第 {page} / {pageCount} 页 · 本页 {pageRows.length} 条
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className={`${DASHBOARD_HEADER_ACTION_BTN_CLASS} disabled:opacity-40`}
              >
                上一页
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => goToPage(page + 1)}
                className={`${DASHBOARD_HEADER_ACTION_BTN_CLASS} disabled:opacity-40`}
              >
                下一页
              </button>
              <label className="flex items-center gap-1 text-[10px] text-ganshale-muted">
                跳至
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = Number(jumpInput)
                      if (Number.isFinite(n)) goToPage(n)
                    }
                  }}
                  className={`w-12 ${GS_FIELD_INPUT_SM_CLASS} text-ganshale-text`}
                />
                页
              </label>
              <button
                type="button"
                onClick={() => {
                  const n = Number(jumpInput)
                  if (Number.isFinite(n)) goToPage(n)
                }}
                className={DASHBOARD_HEADER_ACTION_BTN_CLASS}
              >
                跳转
              </button>
            </div>
          </div>
        ) : null}
    </DashboardModalRoot>
  )
}
