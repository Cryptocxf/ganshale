import { Timer, TrendingDown, TrendingUp } from 'lucide-react'
import { compareLocalCalendarWeek } from '../lib/timeutil'
import { type WeekCompareTone } from '../lib/weeklyWorktime'
import { DASHBOARD_SECTION_DESCRIPTIONS } from '../lib/dashboardSectionDescriptions'
import { DashboardSectionTitle } from './DashboardSectionTitle'
import { WeeklyHoursMinutesDisplay } from './WeeklyHoursMinutesDisplay'
import { WeeklyWorkDurationDisplay } from './WeeklyWorkDurationDisplay'

const COMPARE_TONE_CLASS: Record<WeekCompareTone, string> = {
  up: 'text-red-600',
  down: 'text-emerald-600',
  flat: 'text-ganshale-muted',
  none: 'text-ganshale-muted',
}

export function WeeklyWorkDurationCard({
  weekStart,
  weekNo,
  ready,
  currentSec,
  compareLine,
  compareTone,
  avgSec,
  workDays,
  weekDaysTotal = 7,
  liveTotal = false,
}: {
  weekStart: Date
  weekNo: number
  ready: boolean
  currentSec: number
  compareLine: string
  compareTone: WeekCompareTone
  avgSec: number
  workDays: number
  weekDaysTotal?: number
  liveTotal?: boolean
}) {
  const weekKind = compareLocalCalendarWeek(weekStart)
  const titleLabel = weekKind === 'current' ? '本周总工作时长' : '当周总工作时长'
  const officeDurationSurface =
    weekKind === 'current'
      ? 'gs-office-duration-card'
      : weekKind === 'past'
        ? 'gs-office-duration-card gs-office-duration-card--past'
        : ''

  const CompareIcon =
    compareTone === 'up' ? TrendingUp : compareTone === 'down' ? TrendingDown : null

  return (
    <div
      className={[
        'gs-card relative flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-3.5',
        officeDurationSurface,
      ].join(' ')}
    >
      <div className="relative z-[1] flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0 text-left">
          <DashboardSectionTitle
            icon={Timer}
            description={DASHBOARD_SECTION_DESCRIPTIONS.weeklyTotalDuration}
          >
            {titleLabel}
          </DashboardSectionTitle>
        </div>
        <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-violet-800">
          第 {weekNo} 周
        </span>
      </div>

      <div className="relative z-[1] mt-3 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        {!ready ? (
          <p className="text-xs text-ganshale-muted">加载中…</p>
        ) : weekKind === 'future' ? (
          <p className="text-xs text-ganshale-muted">该周尚未开始</p>
        ) : (
          <div className="flex w-full max-w-[16rem] flex-col items-center">
            <WeeklyWorkDurationDisplay totalSec={currentSec} live={liveTotal} />

            <p
              className={[
                'mt-2 flex items-center justify-center gap-1 text-[12px] font-medium leading-snug',
                COMPARE_TONE_CLASS[compareTone],
              ].join(' ')}
            >
              {CompareIcon ? (
                <CompareIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              ) : null}
              {compareLine}
            </p>

            <div className="my-3 w-full border-t border-ganshale-border" role="presentation" />

            <div className="grid w-full grid-cols-2 gap-3">
              <div className="flex flex-col items-center text-center">
                <p className="text-[11px] text-ganshale-muted">日均时长</p>
                <div className="mt-1">
                  <WeeklyHoursMinutesDisplay totalSec={avgSec} size="md" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-ganshale-muted">工作天数</p>
                <p className="mt-0.5 text-[15px] font-bold tabular-nums text-ganshale-text">
                  {workDays} / {weekDaysTotal}天
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
