import { ClipboardList } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DAILY_REPORT_HISTORY_CHANGED_EVENT,
  loadDailyReportHistory,
} from '../lib/dailyReportHistoryStore'
import { loadWorkRecords, type WorkRecordRow } from '../lib/workRecordStore'
import { daysInLocalWeek, toYmdLocal } from '../lib/timeutil'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import {
  DASHBOARD_CARD_INSET_BOTTOM,
  DASHBOARD_CARD_INSET_X,
  DASHBOARD_CARD_INSET_TOP,
  DASHBOARD_PAIR_CARD_HEADER_MIN_CLASS,
  DASHBOARD_PAIR_SCROLL_BODY_CLASS,
} from './dashboardLayout'

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

type DayDetailRow = {
  ymd: string
  weekday: string
  workRows: WorkRecordRow[]
  reportCount: number
}

export function WeeklyDailyWorkDetailPanel({ weekStart }: { weekStart: Date }) {
  const [rev, setRev] = useState(0)

  const reload = useCallback(() => setRev((n) => n + 1), [])

  useEffect(() => {
    const onChange = () => reload()
    window.addEventListener(DAILY_REPORT_HISTORY_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(DAILY_REPORT_HISTORY_CHANGED_EVENT, onChange)
  }, [reload])

  void rev

  const rows = useMemo((): DayDetailRow[] => {
    return daysInLocalWeek(weekStart).map((day) => {
      const workRows = loadWorkRecords(day).filter((r) => r.content.trim())
      const reports = loadDailyReportHistory(day)
      return {
        ymd: toYmdLocal(day),
        weekday: WEEKDAY_ZH[day.getDay()] ?? '—',
        workRows,
        reportCount: reports.length,
      }
    })
  }, [weekStart, rev])

  const totalItems = useMemo(
    () => rows.reduce((n, r) => n + r.workRows.length, 0),
    [rows],
  )

  return (
    <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className={[
          'shrink-0 border-b border-ganshale-border',
          DASHBOARD_PAIR_CARD_HEADER_MIN_CLASS,
          DASHBOARD_CARD_INSET_X,
          DASHBOARD_CARD_INSET_TOP,
          'pb-2',
        ].join(' ')}
      >
        <DashboardSectionTitle icon={ClipboardList}>每日工作明细</DashboardSectionTitle>
        <DashboardSectionSubtitle>
          周内每日工作记录（有内容的行）与日报条数
        </DashboardSectionSubtitle>
      </div>
      <div
        className={[
          DASHBOARD_CARD_INSET_X,
          DASHBOARD_CARD_INSET_BOTTOM,
          'flex min-h-0 flex-1 flex-col overflow-hidden',
        ].join(' ')}
      >
        <div
          className={[
            DASHBOARD_PAIR_SCROLL_BODY_CLASS,
            'overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]',
          ].join(' ')}
        >
          {totalItems === 0 ? (
            <p className="flex h-full items-center justify-center text-center text-xs text-ganshale-muted">
              本周暂无工作记录明细
            </p>
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {rows.map((day) =>
                day.workRows.length === 0 ? null : (
                  <div key={day.ymd} className="px-0.5 py-1.5">
                    <p className="mb-1 text-[10px] font-semibold text-ganshale-text">
                      {day.weekday}{' '}
                      <span className="font-mono font-normal text-ganshale-muted">{day.ymd}</span>
                      {day.reportCount > 0 ? (
                        <span className="ml-1 font-normal text-ganshale-subtle">
                          · {day.reportCount} 条日报
                        </span>
                      ) : null}
                    </p>
                    <ul className="space-y-1">
                      {day.workRows.map((row) => (
                        <li
                          key={row.id}
                          className="gs-dashboard-modal__inset rounded-md px-2 py-1 text-[10px] leading-snug text-ganshale-text"
                        >
                          <span className="line-clamp-2">{row.content.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
