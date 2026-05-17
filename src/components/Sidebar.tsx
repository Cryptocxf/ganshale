import {
  Activity,
  AppWindow,
  Database,
  Globe,
  LayoutDashboard,
  Settings2,
} from 'lucide-react'
import { GanshaleLogoMark } from './brand/GanshaleLogoMark'
import { PRODUCT_TAGLINE } from '../constants/brand'
import type { NavKey } from '../data/mock'

const items: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: '总览', icon: LayoutDashboard },
  { key: 'timeline', label: '时间轴', icon: Activity },
  { key: 'apps', label: '应用', icon: AppWindow },
  { key: 'browser', label: '浏览器', icon: Globe },
  { key: 'raw', label: '原始数据', icon: Database },
  { key: 'settings', label: '设置', icon: Settings2 },
]

interface SidebarProps {
  active: NavKey
  onNavigate: (key: NavKey) => void
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-ganshale-border bg-ganshale-sidebar">
      <div className="flex gap-3 px-5 pb-2 pt-8">
        <GanshaleLogoMark size={44} className="shrink-0 text-zinc-600 drop-shadow-sm" />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold tracking-tight text-ganshale-text">
            干啥了
          </p>
          <p className="mt-2 text-[11px] leading-snug text-ganshale-muted">
            {PRODUCT_TAGLINE}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-6 pt-4" aria-label="主导航">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              className={[
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                isActive
                  ? 'bg-ganshale-surface font-medium text-ganshale-text shadow-sm ring-1 ring-ganshale-border'
                  : 'text-ganshale-muted hover:bg-white hover:text-ganshale-text',
              ].join(' ')}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mx-3 mb-4 rounded-lg border border-ganshale-border bg-ganshale-surface px-3 py-2.5 shadow-sm">
        <p className="text-[10px] text-ganshale-subtle">
          {typeof window !== 'undefined' && window.ganshaleDesktop
            ? '桌面端'
            : '网页端'}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-ganshale-muted">
          IndexedDB
        </p>
      </div>
    </aside>
  )
}
