import { Info } from 'lucide-react'
import { UpdateSettings } from './UpdateSettings'
import { APP_LAST_UPDATED } from '../constants/brand'
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <GanshaleLogoMark variant="app" size={72} className="rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-display text-base font-bold text-ganshale-text">
              {APP_DISPLAY_NAME}
              <span className="ml-1.5 text-sm font-medium text-ganshale-muted">
                {APP_PRODUCT_NAME}
              </span>
            </h3>
            <p className="text-xs leading-relaxed text-ganshale-muted">{APP_TAGLINE}</p>
            <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <div className="space-y-1">
                <dt className="text-ganshale-subtle">版本</dt>
                <dd className="font-mono text-ganshale-text">v{APP_VERSION}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-ganshale-subtle">版本日期</dt>
                <dd className="font-mono text-ganshale-text">{APP_LAST_UPDATED}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-ganshale-subtle">运行环境</dt>
                <dd className="text-ganshale-text">{runtimeLabel}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="min-w-0 border-t border-ganshale-border pt-4 lg:w-[26rem] lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <UpdateSettings embedded />
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
