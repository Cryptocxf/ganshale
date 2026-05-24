import { useState } from 'react'
import {
  Bot,
  Clock,
  Info,
  ScrollText,
  Settings2,
} from 'lucide-react'
import { AppearanceSettings } from './AppearanceSettings'
import { AboutSettings } from './AboutSettings'
import { DataManagementSettings } from './DataManagementSettings'
import { ModelConfigSettings } from './ModelConfigSettings'
import { PromptsSettings } from './PromptsSettings'
import { TimeSettings } from './TimeSettings'
import {
  SETTINGS_CONTENT_PANEL_CLASS,
  SETTINGS_NAV_PANEL_CLASS,
  SETTINGS_SHELL_CLASS,
} from './dashboardLayout'

type SettingsSection = 'general' | 'time' | 'prompts' | 'models' | 'about'

const NAV: { id: SettingsSection; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: '基础设置', icon: Settings2 },
  { id: 'models', label: '模型配置', icon: Bot },
  { id: 'prompts', label: '提示词', icon: ScrollText },
  { id: 'time', label: '时间', icon: Clock },
  { id: 'about', label: '关于', icon: Info },
]

const navBtn =
  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition'
const navActive =
  'bg-slate-900 font-medium text-white shadow-[0_1px_3px_rgb(15_23_42_/_0.15)]'
const navIdle = 'text-ganshale-muted hover:bg-slate-100 hover:text-ganshale-text'

export function SettingsView() {
  const [section, setSection] = useState<SettingsSection>('general')

  return (
    <div className={SETTINGS_SHELL_CLASS}>
      <nav className={SETTINGS_NAV_PANEL_CLASS} aria-label="设置分类">
        <ul className="space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const on = section === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSection(id)}
                  className={[navBtn, on ? navActive : navIdle].join(' ')}
                  aria-current={on ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.65} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div
        className={[
          SETTINGS_CONTENT_PANEL_CLASS,
          section === 'prompts' ? 'overflow-hidden' : '',
          section !== 'prompts' ? 'space-y-6' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {section === 'prompts' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <PromptsSettings />
          </div>
        ) : section === 'about' ? (
          <AboutSettings />
        ) : section === 'models' ? (
          <ModelConfigSettings />
        ) : section === 'time' ? (
          <TimeSettings />
        ) : (
          <>
            <AppearanceSettings />
            <DataManagementSettings />
          </>
        )}
      </div>
    </div>
  )
}
