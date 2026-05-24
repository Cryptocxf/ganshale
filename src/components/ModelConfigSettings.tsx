import { Bot, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { expandLlmNetworkError } from '../lib/dailyReportChat'
import { getLlmInvokeConfigForUser, isLlmConfigured } from '../lib/llmConfig'
import { testChatCompletion } from '../lib/llmOpenAI'
import {
  guessLlmProviderPresetId,
  LLM_PROVIDER_PRESETS,
  type LlmProviderPreset,
} from '../lib/llmProviderPresets'
import {
  loadLlmUserConfig,
  LLM_NOT_CONFIGURED_HINT,
  normalizeLlmConfigForStorage,
  saveLlmUserConfig,
  type LlmUserConfig,
} from '../lib/llmUserConfig'

import {
  SETTINGS_FIELD_LABEL_BLOCK_CLASS,
  SETTINGS_PAGE_TITLE_CLASS,
} from './dashboardLayout'

const inputCls =
  'gs-field-input w-full min-w-0 rounded-lg px-2.5 py-1 font-mono text-[11px] shadow-sm'

const hintCls = 'text-[10px] leading-relaxed text-ganshale-subtle'

type FormState = {
  baseUrl: string
  apiKey: string
  gatewayModelId: string
}

function configToForm(saved: LlmUserConfig): FormState {
  return {
    baseUrl: saved.baseUrl.trim(),
    apiKey: saved.apiKey.trim(),
    gatewayModelId: saved.gatewayModelId.trim(),
  }
}

function storedModelSnapshot(config: LlmUserConfig) {
  return normalizeLlmConfigForStorage(config)
}

function formToModelFields(form: FormState) {
  const gatewayModelId = form.gatewayModelId.trim()
  return {
    baseUrl: form.baseUrl.trim(),
    apiKey: form.apiKey.trim(),
    gatewayModelId,
    modelMap: gatewayModelId ? ({ 'qwen3.5': gatewayModelId } as const) : {},
  }
}

function resolveRuntimeFromForm(form: FormState) {
  const user = { ...loadLlmUserConfig(), ...formToModelFields(form) }
  return getLlmInvokeConfigForUser(user)
}

export function ModelConfigSettings() {
  const [saved, setSaved] = useState<LlmUserConfig>(() => loadLlmUserConfig())
  const [form, setForm] = useState<FormState>(() => configToForm(loadLlmUserConfig()))
  const [providerId, setProviderId] = useState(() =>
    guessLlmProviderPresetId(loadLlmUserConfig().baseUrl, loadLlmUserConfig().gatewayModelId),
  )
  const [apiKeyHint, setApiKeyHint] = useState(
    () => findPresetHint(guessLlmProviderPresetId(loadLlmUserConfig().baseUrl, loadLlmUserConfig().gatewayModelId)),
  )
  const [note, setNote] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const dirty = useMemo(() => {
    const a = formToModelFields(form)
    const b = storedModelSnapshot(saved)
    return (
      a.baseUrl !== b.baseUrl ||
      a.apiKey !== b.apiKey ||
      a.gatewayModelId !== b.gatewayModelId
    )
  }, [form, saved])

  const applySave = useCallback(() => {
    const next = { ...loadLlmUserConfig(), ...formToModelFields(form) }
    saveLlmUserConfig(next)
    const reloaded = loadLlmUserConfig()
    setSaved(reloaded)
    setForm(configToForm(reloaded))
    setProviderId(guessLlmProviderPresetId(reloaded.baseUrl, reloaded.gatewayModelId))
    setNote('已保存')
    setTestResult(null)
    window.setTimeout(() => setNote(null), 2000)
  }, [form])

  const cancelDraft = useCallback(() => {
    setForm(configToForm(saved))
    setProviderId(guessLlmProviderPresetId(saved.baseUrl, saved.gatewayModelId))
    setApiKeyHint(findPresetHint(guessLlmProviderPresetId(saved.baseUrl, saved.gatewayModelId)))
    setNote(null)
    setTestResult(null)
  }, [saved])

  const applyProviderPreset = useCallback((preset: LlmProviderPreset) => {
    setProviderId(preset.id)
    setApiKeyHint(preset.apiKeyHint)
    if (preset.id === 'custom') return
    setForm((s) => ({
      ...s,
      baseUrl: preset.baseUrl,
      gatewayModelId: preset.modelId,
    }))
    setTestResult(null)
  }, [])

  const runTest = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    setNote(null)
    try {
      const runtime = resolveRuntimeFromForm(form)
      if (!isLlmConfigured({ ...loadLlmUserConfig(), ...formToModelFields(form) })) {
        setTestResult({ ok: false, message: LLM_NOT_CONFIGURED_HINT })
        return
      }
      const reply = await testChatCompletion({
        baseUrl: runtime.baseUrl,
        apiKey: runtime.apiKey,
        model: runtime.model,
      })
      setTestResult({
        ok: true,
        message: `测试成功，模型已正常响应：${reply.slice(0, 120)}`,
      })
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      setTestResult({
        ok: false,
        message: expandLlmNetworkError(raw),
      })
    } finally {
      setTesting(false)
    }
  }, [form])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return (
    <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-3.5 shadow-sm">
      <h3 className={SETTINGS_PAGE_TITLE_CLASS}>
        <Bot className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        模型配置
      </h3>

      <p className="mt-1.5 text-[11px] leading-snug text-ganshale-muted">
        支持任意 OpenAI 兼容网关。首次使用请选择供应商并填写 API Key，保存后建议先点「测试」。
      </p>

      <div className="mt-3 max-w-lg space-y-4 text-xs">
        <div className="space-y-2">
          <label htmlFor="llm-provider" className={SETTINGS_FIELD_LABEL_BLOCK_CLASS}>
            供应商
          </label>
          <select
            id="llm-provider"
            value={providerId}
            className={inputCls}
            onChange={(e) => {
              const preset = LLM_PROVIDER_PRESETS.find((p) => p.id === e.target.value)
              if (preset) applyProviderPreset(preset)
            }}
          >
            {LLM_PROVIDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <p className={hintCls}>选择后会自动填入常用网关地址与模型 ID，可按需修改。</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="llm-base-url" className={SETTINGS_FIELD_LABEL_BLOCK_CLASS}>
            网关地址
          </label>
          <input
            id="llm-base-url"
            type="url"
            value={form.baseUrl}
            placeholder="https://api.example.com/v1"
            className={inputCls}
            onChange={(e) => {
              const baseUrl = e.target.value
              setForm((s) => ({ ...s, baseUrl }))
              setProviderId(guessLlmProviderPresetId(baseUrl, form.gatewayModelId))
            }}
          />
          <p className={hintCls}>OpenAI 兼容接口根路径，须包含 /v1（智谱等部分厂商为 /v4）。</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="llm-api-key" className={SETTINGS_FIELD_LABEL_BLOCK_CLASS}>
            API Key
          </label>
          <input
            id="llm-api-key"
            type="password"
            value={form.apiKey}
            placeholder="sk-..."
            className={inputCls}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setForm((s) => ({ ...s, apiKey: e.target.value }))}
          />
          <p className={hintCls}>{apiKeyHint || '在对应供应商控制台创建 API Key 后粘贴到此处。'}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="llm-gateway-model" className={SETTINGS_FIELD_LABEL_BLOCK_CLASS}>
            模型 ID
          </label>
          <input
            id="llm-gateway-model"
            type="text"
            value={form.gatewayModelId}
            placeholder="gpt-4o-mini"
            className={inputCls}
            onChange={(e) => {
              const gatewayModelId = e.target.value
              setForm((s) => ({ ...s, gatewayModelId }))
              setProviderId(guessLlmProviderPresetId(form.baseUrl, gatewayModelId))
            }}
          />
          <p className={hintCls}>
            发给网关 <span className="font-mono">POST /chat/completions</span> 时的{' '}
            <span className="font-mono">model</span> 字段，须与供应商文档一致。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={applySave}
            className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
          >
            保存
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={cancelDraft}
            className="rounded-lg border border-ganshale-border bg-ganshale-page px-3 py-1 text-xs font-medium text-ganshale-text transition hover:bg-ganshale-elevated disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={() => void runTest()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : null}
            测试
          </button>
          {note ? <span className="text-[11px] text-ganshale-muted">{note}</span> : null}
        </div>

        {testResult ? (
          <p
            className={[
              'whitespace-pre-wrap rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug',
              testResult.ok
                ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900'
                : 'border-red-200/80 bg-red-50/90 text-red-900',
            ].join(' ')}
          >
            {testResult.message}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function findPresetHint(providerId: string): string {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === providerId)?.apiKeyHint ?? ''
}
