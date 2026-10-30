import { memo, useCallback, useEffect, useState } from 'react'
import { DailyDashboard } from './components/DailyDashboard'
import { MonthlyDashboard } from './components/MonthlyDashboard'
import { DataRecordsView } from './components/data/DataRecordsView'
import { SettingsView } from './components/SettingsView'
import { SplashScreen } from './components/brand/SplashScreen'
import { AppChrome } from './components/shell/AppChrome'
import { TodoDashboard } from './components/TodoDashboard'
import { WeeklyDashboard } from './components/WeeklyDashboard'
import { WindowDwellPrompt } from './components/WindowDwellPrompt'
import { useGanshaleData } from './context/useGanshaleData'
import { useTodoReminderScheduler } from './hooks/useTodoReminders'
import { markClientWorkSessionStart } from './lib/clientSessionClock'
import { APP_WINDOW_TITLE } from './constants/brand'
import type { NavKey } from './data/mock'

function isDesktopClient(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ganshaleDesktop)
}

const pageTitle: Record<NavKey, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  todos: '待办',
  data: '数据',
  settings: '设置',
}

const OVERVIEW_NAV: NavKey[] = ['daily', 'weekly', 'monthly']

// 导航仅切换容器可见性，不因父组件更新重渲染已挂载的整张看板。
const DailyPane = memo(DailyDashboard)
const WeeklyPane = memo(WeeklyDashboard)
const MonthlyPane = memo(MonthlyDashboard)

function DataErrorBanner() {
  const { error } = useGanshaleData()
  return error ? <div className="mb-2 shrink-0 rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-950 shadow-sm" role="alert">{error}</div> : null
}

function overviewPaneClass(active: NavKey, key: NavKey): string {
  return active === key ? 'flex min-h-0 flex-1 flex-col' : 'hidden'
}

function ActivePage({
  active,
  onNavigate,
  mountedOverviews,
}: {
  active: NavKey
  onNavigate: (key: NavKey) => void
  mountedOverviews: ReadonlySet<NavKey>
}) {
  return (
    <>
      {mountedOverviews.has('daily') ? (
        <div className={overviewPaneClass(active, 'daily')} aria-hidden={active !== 'daily'}>
          <DailyPane />
        </div>
      ) : null}
      {mountedOverviews.has('weekly') ? (
        <div className={overviewPaneClass(active, 'weekly')} aria-hidden={active !== 'weekly'}>
          <WeeklyPane />
        </div>
      ) : null}
      {mountedOverviews.has('monthly') ? (
        <div className={overviewPaneClass(active, 'monthly')} aria-hidden={active !== 'monthly'}>
          <MonthlyPane onNavigate={onNavigate} />
        </div>
      ) : null}
      {active === 'todos' ? <TodoDashboard /> : null}
      {active === 'data' ? <DataRecordsView /> : null}
      {active === 'settings' ? <SettingsView /> : null}
    </>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(() => isDesktopClient())
  const dismissSplash = useCallback(() => {
    markClientWorkSessionStart()
    setShowSplash(false)
  }, [])
  const [active, setActiveRaw] = useState<NavKey>('daily')
  const [mountedOverviews, setMountedOverviews] = useState<ReadonlySet<NavKey>>(
    () => new Set(['daily']),
  )
  useTodoReminderScheduler(isDesktopClient())

  const setActive = useCallback((key: NavKey) => {
    if (OVERVIEW_NAV.includes(key)) {
      setMountedOverviews((prev) => {
        if (prev.has(key)) return prev
        const next = new Set(prev)
        next.add(key)
        return next
      })
    }
    setActiveRaw(key)
  }, [])

  useEffect(() => {
    document.title = APP_WINDOW_TITLE
  }, [])

  if (showSplash) {
    return <SplashScreen onComplete={dismissSplash} />
  }

  return (
    <AppChrome active={active} onNavigate={setActive} pageTitle={pageTitle[active]}>
      <>
        <DataErrorBanner />
        <ActivePage active={active} onNavigate={setActive} mountedOverviews={mountedOverviews} />
        <WindowDwellPrompt />
      </>
    </AppChrome>
  )
}

export default App
