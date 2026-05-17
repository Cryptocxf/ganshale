import type { ReactNode } from 'react'
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Database,
  Settings2,
} from 'lucide-react'
import { DailyDatePicker } from '../DailyDatePicker'
import { DailyReportHeaderActions } from '../DailyReportHeaderActions'
import { useGanshaleData } from '../../context/useGanshaleData'
import { PRODUCT_TAGLINE } from '../../constants/brand'
import { APP_CHROME_INSET_X_COMPACT } from '../dashboardLayout'
import type { NavKey } from '../../data/mock'

const nav: { key: NavKey; label: string; icon: typeof Calendar }[] = [
  { key: 'daily', label: '每日', icon: Calendar },
  { key: 'weekly', label: '每周', icon: CalendarRange },
  { key: 'monthly', label: '每月', icon: CalendarDays },
  { key: 'yearly', label: '每年', icon: CalendarClock },
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

  const overviewCompact = active === 'daily'
  const compactContentPage =
    active === 'settings' ||
    active === 'weekly' ||
    active === 'monthly' ||
    active === 'yearly' ||
    active === 'data'
  const hidePageHeader = compactContentPage
  const chromeInsetX = APP_CHROME_INSET_X_COMPACT

  return (
    <div
      className={[
        'gs-app-bg flex flex-col',
        overviewCompact ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-dvh',
      ].join(' ')}
    >
      <header className="sticky top-0 z-40 shrink-0 border-b border-black/[0.06] bg-white/[0.72] shadow-[inset_0_-1px_0_rgb(0_0_0_/_0.04)] backdrop-blur-xl backdrop-saturate-150">
        <div
          className={[
            'mx-auto max-w-[min(100%,1280px)]',
            chromeInsetX,
            'py-2',
          ].join(' ')}
        >
          <div
            className={[
              'flex flex-col lg:flex-row lg:items-center lg:justify-between',
              'min-h-8 gap-2 lg:gap-3',
            ].join(' ')}
          >
            <nav
              className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium tracking-tight transition-colors duration-200',
                      on
                        ? 'bg-zinc-900 text-white shadow-sm shadow-black/15'
                        : 'text-ganshale-muted hover:bg-black/[0.04] hover:text-ganshale-text',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4 opacity-90" strokeWidth={1.65} />
                    {label}
                  </button>
                )
              })}
            </nav>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 lg:shrink-0">
              {active === 'daily' ? (
                <DailyDatePicker
                  day={day}
                  daysWithTimingData={daysWithTimingData}
                  onChange={setDay}
                />
              ) : null}
              {active === 'daily' ? <DailyReportHeaderActions /> : null}
            </div>
          </div>
        </div>
      </header>

      <div
        className={[
          'mx-auto flex w-full max-w-[min(100%,1280px)] flex-col',
          chromeInsetX,
          overviewCompact
            ? 'min-h-0 flex-1 pt-2 pb-2.5 sm:pb-3'
            : compactContentPage
              ? 'pt-2 pb-2.5 sm:pb-3'
              : 'py-6 md:py-8',
        ].join(' ')}
      >
        {!overviewCompact && !hidePageHeader ? (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-black/[0.05] pb-5 md:mb-8 md:pb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ganshale-text md:text-[1.65rem]">
              {pageTitle}
            </h1>
            <p className="max-w-[min(100%,22rem)] text-right text-[11px] leading-relaxed text-ganshale-muted md:text-xs">
              {PRODUCT_TAGLINE}
            </p>
          </div>
        ) : null}

        <div
          className={overviewCompact ? 'flex min-h-0 flex-1 flex-col gap-2' : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
