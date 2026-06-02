import { useEffect, useMemo, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { formatDurationHmsZh } from '../lib/aggregations'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import {
  monthSecondsForWeek,
  pickMonthWeekBlocks,
  type MonthlySummary,
} from '../lib/monthlyWorktime'
import { toYmdLocal } from '../lib/timeutil'
import {
  loadWeeklyReportHistory,
  WEEKLY_REPORT_HISTORY_CHANGED_EVENT,
} from '../lib/weeklyReportHistoryStore'
import { WeeklyReportHistoryModal } from './WeeklyReportHistoryModal'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP } from './dashboardLayout'

const WEEK_TILE_CLASS = [
  'gs-day-tile--0',
  'gs-day-tile--1',
  'gs-day-tile--2',
  'gs-day-tile--3',
] as const

const WEEK_TILE_ACTIVE_CLASS = [
  'gs-day-tile-active--0',
  'gs-day-tile-active--1',
  'gs-day-tile-active--2',
  'gs-day-tile-active--3',
] as const

export function MonthlyWeekBlocksPanel({
  monthAnchor,
  summary,
}: {
  monthAnchor: Date
  summary: MonthlySummary
}) {
  const weekBlocks = useMemo(() => pickMonthWeekBlocks(monthAnchor), [monthAnchor])
  const [historyTick, setHistoryTick] = useState(0)
  const [viewWeekStart, setViewWeekStart] = useState<Date | null>(null)

  useEffect(() => {
    const onChange = () => setHistoryTick((n) => n + 1)
    window.addEventListener(WEEKLY_REPORT_HISTORY_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(WEEKLY_REPORT_HISTORY_CHANGED_EVENT, onChange)
  }, [])

  const blocksWithMeta = useMemo(() => {
    void historyTick
    return weekBlocks.map((block, index) => {
      const entries = loadWeeklyReportHistory(block.weekStart)
      const latest = entries[entries.length - 1]
      const preview = latest?.text.trim().split('\n').find((l) => l.trim()) ?? ''
      const seconds = monthSecondsForWeek(summary, block.weekStart)
      return {
        ...block,
        index,
        hasReport: entries.length > 0,
        reportCount: entries.length,
        preview: preview.replace(/^#+\s*/, '').slice(0, 36),
        seconds,
      }
    })
  }, [weekBlocks, summary, historyTick])

  const viewWeekKey = viewWeekStart ? toYmdLocal(viewWeekStart) : null

  return (
    <div className="gs-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className={[DASHBOARD_CARD_INSET_X, DASHBOARD_CARD_INSET_TOP, 'shrink-0 pb-0.5'].join(' ')}>
        <DashboardSectionTitle
          icon={CalendarRange}
          description={DASHBOARD_SECTION_DESCRIPTIONS.monthlyWeekBlocks}
        >
          本月各周
        </DashboardSectionTitle>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        {blocksWithMeta.map((block) => {
          const tileClass = WEEK_TILE_CLASS[block.index] ?? WEEK_TILE_CLASS[0]
          const activeClass = WEEK_TILE_ACTIVE_CLASS[block.index] ?? WEEK_TILE_ACTIVE_CLASS[0]
          const isActive = viewWeekKey === block.weekKey

          return (
            <button
              key={block.weekKey}
              type="button"
              onClick={() => setViewWeekStart(block.weekStart)}
              className={[
                'gs-card flex h-full min-h-0 flex-col items-start justify-between rounded-lg border p-2.5 text-left transition sm:p-3',
                tileClass,
                isActive
                  ? ['ring-2 ring-inset', activeClass].join(' ')
                  : 'hover:brightness-[0.98]',
              ].join(' ')}
            >
              <div className="w-full min-w-0">
                <span className="text-[13px] font-semibold text-ganshale-text">
                  第{block.weekNo}周
                </span>
                <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ganshale-muted">
                  {block.rangeLabel}
                </p>
              </div>
              <p className="mt-1 w-full truncate text-[10px] tabular-nums text-ganshale-text">
                {formatDurationHmsZh(block.seconds)}
              </p>
              <p className="mt-1 w-full truncate text-[10px]">
                {block.hasReport ? (
                  <span className="text-ganshale-mint">
                    {block.reportCount > 1
                      ? `${block.reportCount} 份周报`
                      : block.preview || '已生成周报'}
                  </span>
                ) : (
                  <span className="text-ganshale-subtle">暂无周报</span>
                )}
              </p>
            </button>
          )
        })}
      </div>

      {viewWeekStart ? (
        <WeeklyReportHistoryModal
          open
          weekStart={viewWeekStart}
          onClose={() => setViewWeekStart(null)}
        />
      ) : null}
    </div>
  )
}
