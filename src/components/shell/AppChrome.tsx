import { useEffect, useState, type ReactNode } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  BrickWall,
  ListTodo,
  Bot, ScrollText, Clock, LayoutGrid, Info,
} from 'lucide-react'
import { DailyDatePicker } from '../DailyDatePicker'
import { DailyReportHeaderActions } from '../DailyReportHeaderActions'
import { MonthlyDatePicker } from '../MonthlyDatePicker'
import { MonthlyReportHeaderActions } from '../MonthlyReportHeaderActions'
import { WeeklyDatePicker } from '../WeeklyDatePicker'
import { WeeklyReportHeaderActions } from '../WeeklyReportHeaderActions'
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
import { prefetchMonthlyWindowEvents } from '../../lib/monthlyWorktime'
import type { NavKey } from '../../data/mock'
import { isSettingsSection } from '../../data/mock'
import './appDrawer.css'
import { LogoPreview } from '../brand/LogoPreview'

const nav: { key: NavKey; label: string; icon: typeof Calendar }[] = [
  { key: 'daily', label: '每日', icon: Calendar },
  { key: 'weekly', label: '每周', icon: CalendarRange },
  { key: 'monthly', label: '每月', icon: CalendarDays },
  { key: 'todos', label: '待办', icon: ListTodo },
  { key: 'bricks', label: '工时汇总', icon: BrickWall },
  { key: 'models', label: '模型', icon: Bot },
  { key: 'prompts', label: '提示词', icon: ScrollText },
  { key: 'time', label: '时间', icon: Clock },
  { key: 'theme', label: '主题', icon: LayoutGrid },
  { key: 'about', label: '关于', icon: Info },
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
  const [collapsed,setCollapsed]=useState(false)
  useEffect(()=>{
    const sync=()=>{
      const drawer=document.querySelector('.gs-drawer')
      if(!drawer)return
      // Theme tokens may resolve to oklch()/color(), not just rgb(). Let the
      // browser convert the computed color before passing hex to Electron.
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1
      const context=canvas.getContext('2d',{willReadFrequently:true})
      if(!context)return
      context.fillStyle=getComputedStyle(drawer).backgroundColor
      context.fillRect(0,0,1,1)
      const rgb=Array.from(context.getImageData(0,0,1,1).data).slice(0,3)
      const color='#'+rgb.map(value=>Math.round(value).toString(16).padStart(2,'0')).join('')
      const symbol=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>140?'#26383b':'#edf4f4'
      void window.ganshaleDesktop?.setTitleBarColors?.(color,symbol).catch(()=>{})
    }
    let frame=0
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync)}
    schedule()
    const observer=new MutationObserver(schedule)
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-skin','data-bg','style','class']})
    const media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',schedule)
    return()=>{cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',schedule)}
  },[])
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
    active === 'daily' || active === 'weekly' || active === 'monthly' || active === 'bricks'
  const settingsPage = active === 'settings' || isSettingsSection(active)
  const todosPage = active === 'todos'
  const compactContentPage =
    active === 'bricks' ||
    settingsPage ||
    active === 'weekly' ||
    active === 'monthly' ||
    active === 'todos'
  const hidePageHeader = compactContentPage
  const chromeInsetX = APP_CHROME_INSET_X_COMPACT

  return (
    <div
      className={[
        'gs-app-bg gs-drawer-layout flex flex-col',
        overviewCompact || settingsPage || todosPage
          ? 'h-dvh max-h-dvh overflow-hidden'
          : 'min-h-dvh',
      ].join(' ')}
      data-drawer-collapsed={collapsed}
    >
      <div className="gs-window-drag" aria-hidden="true"/>
      <aside className="gs-drawer" aria-label="应用导航">
        <div className="gs-drawer-brand">
          <LogoPreview />
          {!collapsed&&<div className="gs-drawer-wordmark">干啥了<small>Didly</small></div>}
          <button className="gs-drawer-close" aria-label={collapsed?'展开导航':'收起导航'} aria-expanded={!collapsed} aria-controls="gs-drawer-navigation" onClick={()=>setCollapsed(value=>!value)}>{collapsed?<ChevronRight size={18} strokeWidth={3} aria-hidden/>:<ChevronLeft size={18} strokeWidth={3} aria-hidden/>}</button>
        </div>
                    <div id="gs-drawer-navigation">
              <nav
                className="flex min-w-0 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="主导航"
              >
                {nav.map(({ key, label, icon: Icon }) => {
                  const on = active === key
                  return (
                    <button
                      key={key}
                      aria-label={label}
                      title={collapsed ? label : undefined}
                      aria-current={on ? 'page' : undefined}
                      type="button"
                      onClick={() => onNavigate(key)}
                      onMouseEnter={
                        key === 'monthly' ? () => prefetchMonthlyWindowEvents() : undefined
                      }
                      onFocus={
                        key === 'monthly' ? () => prefetchMonthlyWindowEvents() : undefined
                      }
                      className={[
                        'gs-nav-pill text-ganshale-muted',
                        on ? 'gs-nav-pill--active' : '',
                      ].join(' ')}
                    >
                      <Icon
                        className={['h-4 w-4', on ? 'opacity-100' : 'opacity-90'].join(' ')}
                        strokeWidth={1.65}
                      />
                      {!collapsed && <span className={on ? 'font-bold text-white' : undefined}>{label}</span>}
                    </button>
                  )
                })}
              </nav>
            </div>


        {!collapsed&&<p className="gs-drawer-foot">本地工作记录<span>干啥了 · Didly</span></p>}
      </aside>
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
            <h1 className="gs-workspace-title">{pageTitle}</h1>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 md:shrink-0">
              {active === 'bricks' ? <div id="brick-navigation-tools" /> : null}
              {active === 'daily' ? (
                <>
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
            </div>
          </div>
        </div>
      </header>

      <div
        className={[
          APP_CHROME_CONTENT_WIDTH_CLASS,
          settingsPage || todosPage
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
                Didly
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
              : todosPage
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
