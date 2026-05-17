import { Info } from 'lucide-react'
import {
  APP_COPYRIGHT_OWNER,
  APP_DISPLAY_NAME,
  APP_FEATURES,
  APP_PRODUCT_NAME,
  APP_TAGLINE,
  APP_VERSION,
  appCopyrightYear,
  describeAppRuntime,
} from '../lib/appInfo'
import { GanshaleLogoMark } from './brand/GanshaleLogoMark'

export function AboutSettings() {
  const year = appCopyrightYear()
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
        <h3 className="flex items-center gap-2 text-sm font-medium text-ganshale-text">
          <Info className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
          主要功能
        </h3>
        <div className="mt-3 space-y-4">
          {APP_FEATURES.map(({ title, items }) => (
            <div key={title}>
              <p className="text-xs font-medium text-ganshale-text">{title}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-ganshale-muted">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-ganshale-border bg-ganshale-surface px-4 py-3 shadow-sm">
        <p className="text-[11px] leading-relaxed text-ganshale-muted">
          {APP_DISPLAY_NAME}{' '}
          帮助你把电脑上的真实使用情况整理成可读的工作记录与汇报材料，减少反复回忆与手工整理的时间。
        </p>
        <p className="mt-2 text-[10px] text-ganshale-subtle">
          © {year} 版权所有归「{APP_COPYRIGHT_OWNER}」所有。
        </p>
        <p className="mt-1 text-[10px] text-ganshale-subtle">
          本软件按「原样」提供；使用 AI 功能时需自行配置模型网关与 API 密钥，相关调用费用由您与服务商自行承担。
        </p>
      </section>
    </div>
  )
}
