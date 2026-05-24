import { Info } from 'lucide-react'
import {
  APP_DISPLAY_NAME,
  APP_FEATURES,
  APP_PRODUCT_NAME,
  APP_TAGLINE,
  APP_VERSION,
  describeAppRuntime,
} from '../lib/appInfo'
import { GanshaleLogoMark } from './brand/GanshaleLogoMark'
import {
  SETTINGS_FIELD_LABEL_CLASS,
  SETTINGS_PAGE_TITLE_CLASS,
} from './dashboardLayout'

export function AboutSettings() {
  const runtimeLabel = describeAppRuntime()

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
          <GanshaleLogoMark variant="app" size={72} className="rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-display text-base font-bold text-ganshale-text">
              {APP_DISPLAY_NAME}
              <span className="ml-1.5 text-sm font-medium text-ganshale-muted">
                {APP_PRODUCT_NAME}
              </span>
            </h3>
            <p className="text-xs leading-relaxed text-ganshale-muted">{APP_TAGLINE}</p>
            <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-ganshale-subtle">版本</dt>
                <dd className="font-mono text-ganshale-text">{APP_VERSION}</dd>
              </div>
              <div className="flex justify-between gap-3 sm:block">
                <dt className="text-ganshale-subtle">运行环境</dt>
                <dd className="text-ganshale-text">{runtimeLabel}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
        <h3 className={SETTINGS_PAGE_TITLE_CLASS}>
          <Info className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
          主要功能
        </h3>
        <div className="mt-4 space-y-4">
          {APP_FEATURES.map(({ title, items }) => (
            <div key={title}>
              <p className={SETTINGS_FIELD_LABEL_CLASS}>{title}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-ganshale-muted">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
