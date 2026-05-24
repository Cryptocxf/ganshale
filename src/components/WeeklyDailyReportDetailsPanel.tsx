import { ChevronDown, FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ensureDailyReportTileSummary } from '../lib/dailyReportTileSummary'
import {
  DAILY_REPORT_HISTORY_CHANGED_EVENT,
  loadDailyReportHistory,
  sortDailyReportHistoryByTimeAsc,
  type DailyReportHistoryEntry,
} from '../lib/dailyReportHistoryStore'
import {
  DAILY_REPORT_TILE_SUMMARY_CHANGED_EVENT,
  loadDailyReportTileSummary,
} from '../lib/dailyReportTileSummaryStore'
import { compareLocalCalendarDay, daysInLocalWeek, toYmdLocal } from '../lib/timeutil'
import { DashboardSectionSubtitle } from './DashboardSectionSubtitle'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { MarkdownContent } from './MarkdownContent'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

type WorkdayRow = {
  day: Date
  ymd: string
  weekday: string
  entries: DailyReportHistoryEntry[]
  tileSummary: string
}

function resolveTileSummaryLabel(day: Date, entries: DailyReportHistoryEntry[]): string {
  const stored = loadDailyReportTileSummary(day)
  if (stored?.summary) return stored.summary

  if (entries.length === 0) return '暂无日报'

  const kind = compareLocalCalendarDay(day)
  if (kind === 'today') return '当日 24:00 后生成摘要'
  if (kind === 'future') return '暂无日报'
  return '摘要生成中…'
}

export function WeeklyDailyReportDetailsPanel({ weekStart }: { weekStart: Date }) {
  const weekDays = useMemo(() => daysInLocalWeek(weekStart), [weekStart])

  const [rows, setRows] = useState<WorkdayRow[]>(() => buildRows(weekDays))
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const reload = useCallback(() => {
    setRows(buildRows(weekDays))
  }, [weekDays])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const onChange = () => reload()
    window.addEventListener(DAILY_REPORT_HISTORY_CHANGED_EVENT, onChange)
    window.addEventListener(DAILY_REPORT_TILE_SUMMARY_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(DAILY_REPORT_HISTORY_CHANGED_EVENT, onChange)
      window.removeEventListener(DAILY_REPORT_TILE_SUMMARY_CHANGED_EVENT, onChange)
    }
  }, [reload])

  useEffect(() => {
    setSelectedYmd(null)
    setExpandedId(null)
  }, [weekStart])

  useEffect(() => {
    for (const day of weekDays) {
      const entries = loadDailyReportHistory(day)
      if (entries.length === 0) continue
      const kind = compareLocalCalendarDay(day)
      if (kind !== 'past') continue
      if (loadDailyReportTileSummary(day)?.summary) continue
      void ensureDailyReportTileSummary(day).then(() => reload())
    }
  }, [weekDays, reload])

  const selectedRow = useMemo(
    () => rows.find((r) => r.ymd === selectedYmd) ?? null,
    [rows, selectedYmd],
  )

  const sortedSelected = useMemo(
    () =>
      selectedRow
        ? sortDailyReportHistoryByTimeAsc(selectedRow.entries)
        : [],
    [selectedRow],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-2 sm:p-2.5">
      <div className="shrink-0">
        <DashboardSectionTitle
          icon={FileText}
          description={DASHBOARD_SECTION_DESCRIPTIONS.weeklyDailyReportDetails}
        >
          每日日报详情
        </DashboardSectionTitle>
        <DashboardSectionSubtitle>
          方块摘要为当日最后一条日报经 AI 在 24:00 生成；点击日期查看全部日报
        </DashboardSectionSubtitle>
      </div>

      <div
        className={[
          'mt-2 grid grid-cols-7 items-stretch gap-1.5 sm:gap-2',
          selectedRow ? 'shrink-0' : 'min-h-0 flex-1',
        ].join(' ')}
      >
        {rows.map((row, i) => {
          const active = row.ymd === selectedYmd
          const isToday = compareLocalCalendarDay(row.day) === 'today'
          const tileBorderClass =
            i === 5 ? 'gs-day-tile--sat' : i === 6 ? 'gs-day-tile--sun' : 'gs-day-tile--weekday'
          return (
            <button
              key={row.ymd}
              type="button"
              onClick={() => {
                setSelectedYmd((prev) => (prev === row.ymd ? null : row.ymd))
                setExpandedId(null)
              }}
              className={[
                'relative flex h-full min-h-[5.5rem] flex-col items-center rounded-lg border px-1.5 py-2 transition sm:min-h-0 sm:px-2 sm:py-2.5',
                selectedRow ? 'sm:min-h-[5.5rem]' : '',
                tileBorderClass,
                isToday ? 'gs-day-tile--today' : '',
                active ? 'gs-day-tile-active shadow-sm ring-2' : '',
              ].join(' ')}
            >
              <div className="w-full shrink-0 text-center">
                <p className="text-center text-[13px] font-bold leading-tight tracking-tight text-ganshale-text sm:text-[14px]">
                  {row.weekday}
                </p>
                <p className="mt-0.5 text-center font-mono text-[10px] font-semibold tabular-nums text-ganshale-muted sm:mt-1 sm:text-[11px]">
                  {row.ymd.slice(5)}
                </p>
              </div>
              <p
                className={[
                  'mt-1.5 w-full flex-1 text-center text-[9px] leading-snug sm:mt-2 sm:text-[10px]',
                  'line-clamp-3',
                  row.entries.length > 0 ? 'text-ganshale-text/90' : 'text-ganshale-subtle',
                ].join(' ')}
                title={row.tileSummary}
              >
                {row.tileSummary}
              </p>
            </button>
          )
        })}
      </div>

      {selectedRow ? (
        <div className="gs-weekly-report-detail-panel mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg [scrollbar-gutter:stable]">
          {sortedSelected.length === 0 ? (
            <p className="flex h-full min-h-0 flex-1 items-center justify-center px-3 text-center text-[11px] text-ganshale-muted">
              {selectedRow.weekday} 暂无已保存日报
            </p>
          ) : (
            <ul className="divide-y divide-ganshale-border">
              {sortedSelected.map((entry) => {
                const open = expandedId === entry.id
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : entry.id)}
                      className="gs-weekly-report-detail-item flex w-full items-start gap-2 px-2.5 py-2 text-left transition"
                    >
                      <ChevronDown
                        className={[
                          'mt-0.5 h-3.5 w-3.5 shrink-0 text-ganshale-muted transition',
                          open ? 'rotate-180' : '',
                        ].join(' ')}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] tabular-nums text-ganshale-subtle">
                          {new Date(entry.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ganshale-text">
                          {entry.text.slice(0, 120)}
                          {entry.text.length > 120 ? '…' : ''}
                        </p>
                      </div>
                    </button>
                    {open ? (
                      <div className="gs-weekly-report-detail-expanded px-3 py-2.5 text-[11px] leading-relaxed text-ganshale-text">
                        <MarkdownContent source={entry.text} />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

function buildRows(workdays: Date[]): WorkdayRow[] {
  return workdays.map((day, i) => {
    const entries = loadDailyReportHistory(day)
    return {
      day,
      ymd: toYmdLocal(day),
      weekday: WEEKDAY_LABELS[i] ?? '—',
      entries,
      tileSummary: resolveTileSummaryLabel(day, entries),
    }
  })
}
