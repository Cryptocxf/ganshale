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
  WORK_RECORD_SETTINGS_CHANGED_EVENT,
  type SystemRecordPeriodId,
} from '../lib/workRecordSettings'
import {
  SETTINGS_FIELD_LABEL_BLOCK_CLASS,
  SETTINGS_PAGE_TITLE_CLASS,
} from './dashboardLayout'

const textareaCls =
  'gs-field-input gs-field-input--inset min-h-0 w-full flex-1 resize-none overflow-y-auto rounded-lg p-2.5 text-xs font-normal leading-relaxed text-ganshale-text'

type PromptForm = Pick<
  LlmUserConfig,
  'aiAutoSummaryPrompt' | 'dailyReportPrompt' | 'weeklyReportPrompt' | 'monthlyReportPrompt'
>

type PromptFieldId = keyof PromptForm

function configToPromptForm(config: LlmUserConfig): PromptForm {
  return {
    aiAutoSummaryPrompt: config.aiAutoSummaryPrompt,
    dailyReportPrompt: config.dailyReportPrompt,
    weeklyReportPrompt: config.weeklyReportPrompt,
    monthlyReportPrompt: config.monthlyReportPrompt,
  }
}

const PROMPT_GRID: { id: PromptFieldId; label: string }[][] = [
  [
    { id: 'aiAutoSummaryPrompt', label: 'AI自动总结提示词：' },
    { id: 'dailyReportPrompt', label: '生成日报提示词：' },
  ],
  [
    { id: 'weeklyReportPrompt', label: '生成周报提示词：' },
    { id: 'monthlyReportPrompt', label: '生成月报提示词：' },
  ],
]

function PromptField({
  id,
  label,
  value,
  onChange,
}: {
  id: PromptFieldId
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <label htmlFor={`prompt-${id}`} className={`shrink-0 ${SETTINGS_FIELD_LABEL_BLOCK_CLASS}`}>
        {label}
      </label>
      <textarea
        id={`prompt-${id}`}
        value={value}
        className={textareaCls}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
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
      form.weeklyReportPrompt !== s.weeklyReportPrompt ||
      form.monthlyReportPrompt !== s.monthlyReportPrompt
    )
  }, [form, saved])

  const applySave = useCallback(() => {
    const cur = loadLlmUserConfig()
    saveLlmUserConfig({
      ...cur,
      aiAutoSummaryPrompt: form.aiAutoSummaryPrompt,
      dailyReportPrompt: form.dailyReportPrompt,
      weeklyReportPrompt: form.weeklyReportPrompt,
      monthlyReportPrompt: form.monthlyReportPrompt,
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
    const promptDefaults = defaultLlmUserConfig()
    const cur = loadLlmUserConfig()
    saveLlmUserConfig({
      ...cur,
      aiAutoSummaryPrompt: promptDefaults.aiAutoSummaryPrompt,
      dailyReportPrompt: promptDefaults.dailyReportPrompt,
      weeklyReportPrompt: promptDefaults.weeklyReportPrompt,
      monthlyReportPrompt: promptDefaults.monthlyReportPrompt,
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

  const displayValue = (id: PromptFieldId) =>
    id === 'aiAutoSummaryPrompt' ? aiAutoSummaryDisplay : form[id]

  const updateField = (id: PromptFieldId, v: string) => {
    if (
      id === 'aiAutoSummaryPrompt' &&
      usesAiAutoSummaryWindowPlaceholder(form.aiAutoSummaryPrompt)
    ) {
      const phrase = resolveAiAutoSummaryPrompt(form.aiAutoSummaryPrompt, summaryPeriod)
      if (v === phrase) return
    }
    setForm((s) => ({ ...s, [id]: v }))
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-col rounded-xl border border-ganshale-border bg-ganshale-surface py-4 pl-4 pr-[10px] shadow-sm">
      <h3 className={`shrink-0 ${SETTINGS_PAGE_TITLE_CLASS}`}>
        <ScrollText className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        提示词
      </h3>

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 text-xs">
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-x-4 gap-y-4">
          {PROMPT_GRID.flat().map(({ id, label }) => (
            <PromptField
              key={id}
              id={id}
              label={label}
              value={displayValue(id)}
              onChange={(v) => updateField(id, v)}
            />
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
