import { useEffect, useState, type ReactNode } from 'react'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Database,
  ListTodo,
  Settings2,
} from 'lucide-react'
import { DailyDatePicker } from '../DailyDatePicker'
import { WorkdayTimerToggle } from '../WorkdayTimerToggle'
import { DailyReportHeaderActions } from '../DailyReportHeaderActions'
import { MonthlyDatePicker } from '../MonthlyDatePicker'
import { MonthlyReportHeaderActions } from '../MonthlyReportHeaderActions'
import { WeeklyDatePicker } from '../WeeklyDatePicker'
import { WeeklyReportHeaderActions } from '../WeeklyReportHeaderActions'
import { DataRecordsHeaderActions } from '../data/DataRecordsHeaderActions'
import { useGanshaleData } from '../../context/useGanshaleData'
import { useMonthlyReportOptional } from '../../context/MonthlyReportContext'
import { useWeeklyReportOptional } from '../../context/WeeklyReportContext'
import {
  loadWeekKeysWithWeeklyReports,
  WEEKLY_REPORT_HISTORY_CHANGED_EVENT,
} from '../../lib/weeklyReportHistoryStore'
import {
  APP_CHROME_CONTENT_WIDTH_CLASS,
  APP_CHROME_INSET_COMPACT,
  APP_CHROME_INSET_X_COMPACT,
  DAILY_CHROME_HEADER_TOOLBAR_MIN_H_CLASS,
} from '../dashboardLayout'
import type { NavKey } from '../../data/mock'

const nav: { key: NavKey; label: string; icon: typeof Calendar }[] = [
  { key: 'daily', label: '每日', icon: Calendar },
  { key: 'weekly', label: '每周', icon: CalendarRange },
  { key: 'monthly', label: '每月', icon: CalendarDays },
  { key: 'todos', label: '待办', icon: ListTodo },
  { key: 'data', label: '数据', icon: Database },
  { key: 'settings', label: '设置', icon: Settings2 },
]

interface AppChromeProps {
  active: NavKey
  onNavigate: (k: NavKey) => void
  pageTitle: string
  children: ReactNode
}

export function AppChrome({
  active,
  onNavigate,
  pageTitle,
  children,
}: AppChromeProps) {
  const { day, setDay, daysWithTimingData } = useGanshaleData()
  const weeklyReport = useWeeklyReportOptional()
  const monthlyReport = useMonthlyReportOptional()
  const [weeksWithReports, setWeeksWithReports] = useState(() =>
    loadWeekKeysWithWeeklyReports(),
  )

  useEffect(() => {
    const sync = () => setWeeksWithReports(loadWeekKeysWithWeeklyReports())
    window.addEventListener(WEEKLY_REPORT_HISTORY_CHANGED_EVENT, sync)
    return () => window.removeEventListener(WEEKLY_REPORT_HISTORY_CHANGED_EVENT, sync)
  }, [])

  const overviewCompact =
    active === 'daily' || active === 'weekly' || active === 'monthly'
  const settingsPage = active === 'settings'
  const dataPage = active === 'data'
  const todosPage = active === 'todos'
  const compactContentPage =
    active === 'settings' ||
    active === 'weekly' ||
    active === 'monthly' ||
    active === 'data' ||
    active === 'todos'
  const hidePageHeader = compactContentPage
  const chromeInsetX = APP_CHROME_INSET_X_COMPACT

  return (
    <div
      className={[
        'gs-app-bg flex flex-col',
        overviewCompact || settingsPage || dataPage || todosPage
          ? 'h-dvh max-h-dvh overflow-hidden'
          : 'min-h-dvh',
      ].join(' ')}
    >
      <header className="gs-chrome-header sticky top-0 z-40 shrink-0">
        <div
          className={[
            APP_CHROME_CONTENT_WIDTH_CLASS,
            chromeInsetX,
            'py-2',
          ].join(' ')}
        >
          <div
            className={[
              'flex flex-col md:flex-row md:items-center md:justify-between',
              DAILY_CHROME_HEADER_TOOLBAR_MIN_H_CLASS,
              'gap-2 md:gap-3',
            ].join(' ')}
          >
            <div className="flex min-w-0 items-center">
              <nav
                className="flex min-w-0 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="主导航"
              >
                {nav.map(({ key, label, icon: Icon }) => {
                  const on = active === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onNavigate(key)}
                      className={[
                        'gs-nav-pill text-ganshale-muted',
                        on ? 'gs-nav-pill--active' : '',
                      ].join(' ')}
                    >
                      <Icon
                        className={['h-4 w-4', on ? 'opacity-100' : 'opacity-90'].join(' ')}
                        strokeWidth={1.65}
                      />
                      <span className={on ? 'font-bold text-white' : undefined}>{label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 md:shrink-0">
              {active === 'daily' ? (
                <>
                  <WorkdayTimerToggle day={day} />
                  <DailyDatePicker
                    day={day}
                    daysWithTimingData={daysWithTimingData}
                    onChange={setDay}
                  />
                </>
              ) : null}
              {active === 'weekly' && weeklyReport ? (
                <WeeklyDatePicker
                  weekStart={weeklyReport.weekStart}
                  weeksWithReports={weeksWithReports}
                  onChange={weeklyReport.setWeekStart}
                />
              ) : null}
              {active === 'monthly' && monthlyReport ? (
                <MonthlyDatePicker
                  monthAnchor={monthlyReport.monthAnchor}
                  onChange={monthlyReport.setMonthAnchor}
                />
              ) : null}
              {active === 'daily' ? <DailyReportHeaderActions /> : null}
              {active === 'weekly' ? <WeeklyReportHeaderActions /> : null}
              {active === 'monthly' ? <MonthlyReportHeaderActions /> : null}
              {active === 'data' ? <DataRecordsHeaderActions /> : null}
            </div>
          </div>
        </div>
      </header>

      <div
        className={[
          APP_CHROME_CONTENT_WIDTH_CLASS,
          settingsPage || dataPage || todosPage
            ? [APP_CHROME_INSET_COMPACT, 'flex min-h-0 flex-1 flex-col'].join(' ')
            : [
                chromeInsetX,
                overviewCompact
                  ? 'min-h-0 flex-1 pt-2 pb-2.5 sm:pb-3'
                  : compactContentPage
                    ? 'pt-2 pb-2.5 sm:pb-3'
                    : 'py-6 md:py-8',
              ].join(' '),
        ].join(' ')}
      >
        {!overviewCompact && !hidePageHeader ? (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/90 pb-5 md:mb-8 md:pb-6">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ganshale-sky">
                Ganshale
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ganshale-text md:text-[1.65rem]">
                {pageTitle}
              </h1>
            </div>
          </div>
        ) : null}

        <div
          className={[
            overviewCompact
              ? 'flex min-h-0 flex-1 flex-col gap-2'
              : dataPage || todosPage
                ? 'flex min-h-0 flex-1 flex-col'
              : settingsPage
                ? 'gs-page-enter flex min-h-0 flex-1 flex-col'
                : 'gs-page-enter',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
