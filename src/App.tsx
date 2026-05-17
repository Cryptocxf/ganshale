import { useCallback, useEffect, useState } from 'react'
import { DailyDashboard } from './components/DailyDashboard'
import { MonthlyDashboard } from './components/MonthlyDashboard'
import { RawDataView } from './components/RawDataView'
import { SettingsView } from './components/SettingsView'
import { SplashScreen } from './components/brand/SplashScreen'
import { AppChrome } from './components/shell/AppChrome'
import { WeeklyDashboard } from './components/WeeklyDashboard'
import { WindowDwellPrompt } from './components/WindowDwellPrompt'
import { YearlyDashboard } from './components/YearlyDashboard'
import { useGanshaleData } from './context/useGanshaleData'
import { markClientWorkSessionStart } from './lib/clientSessionClock'
import { APP_DOCUMENT_TITLE } from './constants/brand'
import type { NavKey } from './data/mock'

function isDesktopClient(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ganshaleDesktop)
}

const pageTitle: Record<NavKey, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  data: '数据',
  settings: '设置',
}

function ActivePage({ active }: { active: NavKey }) {
  switch (active) {
    case 'daily':
      return <DailyDashboard />
    case 'weekly':
      return <WeeklyDashboard />
    case 'monthly':
      return <MonthlyDashboard />
    case 'yearly':
      return <YearlyDashboard />
    case 'data':
      return <RawDataView />
    case 'settings':
      return <SettingsView />
    default:
      return null
  }
}

function App() {
  const [showSplash, setShowSplash] = useState(isDesktopClient)
  const dismissSplash = useCallback(() => {
    markClientWorkSessionStart()
    setShowSplash(false)
  }, [])
  const [active, setActive] = useState<NavKey>('daily')
  const { error } = useGanshaleData()

  useEffect(() => {
    document.title = APP_DOCUMENT_TITLE
  }, [])

  if (showSplash) {
    return <SplashScreen onComplete={dismissSplash} />
  }

  return (
    <AppChrome active={active} onNavigate={setActive} pageTitle={pageTitle[active]}>
      <>
        {error ? (
          <div
            className={[
              'rounded-xl border border-red-200/75 bg-red-50/95 px-4 py-3 text-sm text-red-900 shadow-[0_1px_2px_rgb(0_0_0_/_0.04)]',
              active === 'daily' ||
              active === 'settings' ||
              active === 'weekly' ||
              active === 'monthly' ||
              active === 'yearly' ||
              active === 'data'
                ? 'mb-2 shrink-0'
                : 'mb-6',
            ].join(' ')}
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <ActivePage active={active} />
        <WindowDwellPrompt />
      </>
    </AppChrome>
  )
}

export default App
