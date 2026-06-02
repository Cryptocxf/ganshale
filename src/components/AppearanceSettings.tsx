import { LayoutGrid } from 'lucide-react'
import { useAppearance } from '../context/AppearanceProvider'
import { SKIN_PRESETS, type SkinKey } from '../lib/skins'
import { SETTINGS_PAGE_TITLE_CLASS } from './dashboardLayout'
import { SkinPreviewScene } from './SkinPreviewScene'

export function AppearanceSettings() {
  const { config, setSkin } = useAppearance()

  return (
    <section className="gs-card p-4">
      <h3 className={SETTINGS_PAGE_TITLE_CLASS}>
        <LayoutGrid className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        主题
      </h3>
      <p className="mt-1 text-[10px] text-ganshale-muted">
        切换配色与界面样式；「默认」为 Times + 微软雅黑，其余为设计技能原版字体
      </p>
      <div className="mt-3 grid grid-cols-4 gap-x-1.5 gap-y-3">
        {SKIN_PRESETS.map((skin) => {
          const on = config.skin === skin.key
          return (
            <button
              key={skin.key}
              type="button"
              onClick={() => setSkin(skin.key as SkinKey)}
              className={[
                'flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition',
                on ? 'bg-ganshale-accent/5 ring-1 ring-ganshale-accent/25' : 'hover:bg-ganshale-elevated',
              ].join(' ')}
              aria-label={`${skin.label}，${skin.description}`}
              aria-pressed={on}
            >
              <SkinPreviewScene skin={skin.key} />
              <span
                className={[
                  'w-full text-center text-[10px] leading-tight',
                  on ? 'font-bold text-ganshale-text' : 'font-medium text-ganshale-text',
                ].join(' ')}
              >
                {skin.label}
              </span>
              <span className="w-full px-0.5 text-center text-[9px] leading-snug text-ganshale-muted">
                {skin.description}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
