import { ScrollText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  resolveAiAutoSummaryPrompt,
  usesAiAutoSummaryWindowPlaceholder,
} from '../lib/aiAutoSummaryPrompt'
import {
  defaultLlmUserConfig,
  loadLlmUserConfig,
  saveLlmUserConfig,
  type LlmUserConfig,
} from '../lib/llmUserConfig'
import {
  loadWorkRecordSettings,
  saveWorkRecordSettings,
  WORK_RECORD_SETTINGS_CHANGED_EVENT,
  type SystemRecordPeriodId,
} from '../lib/workRecordSettings'
import { WorkRecordGeneralSettings } from './WorkRecordGeneralSettings'

const labelCls = 'text-xs font-medium text-ganshale-text'
/** 原首个输入框 rows=16，统一高度为其 60% */
const PROMPT_TEXTAREA_ROWS = Math.round(16 * 0.6)
const textareaCls =
  'w-full resize-y rounded-lg border border-black/[0.06] bg-ganshale-page/40 p-2 text-[11px] leading-relaxed text-ganshale-text focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10'

type PromptForm = Pick<
  LlmUserConfig,
  'aiAutoSummaryPrompt' | 'dailyReportPrompt' | 'weeklyReportPrompt'
>

function configToPromptForm(config: LlmUserConfig): PromptForm {
  return {
    aiAutoSummaryPrompt: config.aiAutoSummaryPrompt,
    dailyReportPrompt: config.dailyReportPrompt,
    weeklyReportPrompt: config.weeklyReportPrompt,
  }
}

const PROMPT_FIELDS: { id: keyof PromptForm; label: string }[] = [
  { id: 'aiAutoSummaryPrompt', label: 'AI自动总结提示词：' },
  { id: 'dailyReportPrompt', label: '生成日报提示词：' },
  { id: 'weeklyReportPrompt', label: '生成周报提示词：' },
]

const DEFAULT_WORK_RECORD_FOR_PROMPTS = {
  aiAutoSummaryEnabled: true,
  systemRecordPeriod: '30m' as SystemRecordPeriodId,
}

export function PromptsSettings() {
  const [saved, setSaved] = useState<LlmUserConfig>(() => loadLlmUserConfig())
  const [form, setForm] = useState<PromptForm>(() => configToPromptForm(loadLlmUserConfig()))
  const [summaryPeriod, setSummaryPeriod] = useState<SystemRecordPeriodId>(
    () => loadWorkRecordSettings().systemRecordPeriod,
  )
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setSummaryPeriod(loadWorkRecordSettings().systemRecordPeriod)
    window.addEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(WORK_RECORD_SETTINGS_CHANGED_EVENT, sync)
  }, [])

  const aiAutoSummaryDisplay = useMemo(
    () => resolveAiAutoSummaryPrompt(form.aiAutoSummaryPrompt, summaryPeriod),
    [form.aiAutoSummaryPrompt, summaryPeriod],
  )

  const dirty = useMemo(() => {
    const s = configToPromptForm(saved)
    return (
      form.aiAutoSummaryPrompt !== s.aiAutoSummaryPrompt ||
      form.dailyReportPrompt !== s.dailyReportPrompt ||
      form.weeklyReportPrompt !== s.weeklyReportPrompt
    )
  }, [form, saved])

  const applySave = useCallback(() => {
    const cur = loadLlmUserConfig()
    saveLlmUserConfig({
      ...cur,
      aiAutoSummaryPrompt: form.aiAutoSummaryPrompt,
      dailyReportPrompt: form.dailyReportPrompt,
      weeklyReportPrompt: form.weeklyReportPrompt,
    })
    const next = loadLlmUserConfig()
    setSaved(next)
    setForm(configToPromptForm(next))
    setNote('已保存')
    window.setTimeout(() => setNote(null), 2000)
  }, [form])

  const cancelDraft = useCallback(() => {
    setForm(configToPromptForm(saved))
    setNote(null)
  }, [saved])

  const restoreDefaults = useCallback(() => {
    saveWorkRecordSettings(DEFAULT_WORK_RECORD_FOR_PROMPTS)
    setSummaryPeriod('30m')

    const promptDefaults = defaultLlmUserConfig()
    const cur = loadLlmUserConfig()
    saveLlmUserConfig({
      ...cur,
      aiAutoSummaryPrompt: promptDefaults.aiAutoSummaryPrompt,
      dailyReportPrompt: promptDefaults.dailyReportPrompt,
      weeklyReportPrompt: promptDefaults.weeklyReportPrompt,
    })

    const next = loadLlmUserConfig()
    setSaved(next)
    setForm(configToPromptForm(next))
    setNote('已恢复默认')
    window.setTimeout(() => setNote(null), 2000)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return (
    <section className="w-full rounded-xl border border-ganshale-border bg-ganshale-surface py-4 pl-4 pr-[10px] shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-medium text-ganshale-text">
        <ScrollText className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        提示词
      </h3>

      <div className="mt-4 w-full space-y-4 text-xs">
        <WorkRecordGeneralSettings />

        {PROMPT_FIELDS.map(({ id, label }) => (
          <div key={id} className="space-y-1.5">
            <label htmlFor={`prompt-${id}`} className={labelCls}>
              {label}
            </label>
            <textarea
              id={`prompt-${id}`}
              rows={PROMPT_TEXTAREA_ROWS}
              value={id === 'aiAutoSummaryPrompt' ? aiAutoSummaryDisplay : form[id]}
              className={textareaCls}
              onChange={(e) => {
                const v = e.target.value
                if (id === 'aiAutoSummaryPrompt' && usesAiAutoSummaryWindowPlaceholder(form.aiAutoSummaryPrompt)) {
                  const phrase = resolveAiAutoSummaryPrompt(form.aiAutoSummaryPrompt, summaryPeriod)
                  if (v === phrase) return
                }
                setForm((s) => ({ ...s, [id]: v }))
              }}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={applySave}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
          >
            保存
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={cancelDraft}
            className="rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-1.5 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={restoreDefaults}
            className="rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-1.5 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated"
          >
            恢复默认
          </button>
          {note ? <span className="text-[11px] text-ganshale-muted">{note}</span> : null}
        </div>
      </div>
    </section>
  )
}
