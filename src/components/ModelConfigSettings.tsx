import { Bot, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAILY_REPORT_MODELS, type DailyReportModelId } from '../lib/dailyReportPrefs'
import { expandLlmNetworkError } from '../lib/dailyReportChat'
import { getLlmInvokeConfigForUser } from '../lib/llmConfig'
import { testChatCompletion } from '../lib/llmOpenAI'
import {
  API_KEY_MASK_DISPLAY,
  DEFAULT_GATEWAY_MODEL_ID,
  describeDefaultLlmBaseUrl,
  isBuiltinLlmApiKey,
  loadLlmUserConfig,
  normalizeLlmConfigForStorage,
  saveLlmUserConfig,
  type LlmUserConfig,
} from '../lib/llmUserConfig'

const inputCls =
  'w-full min-w-0 rounded-lg border border-black/[0.08] bg-white px-2.5 py-1.5 font-mono text-[11px] text-ganshale-text shadow-sm focus:border-ganshale-text/25 focus:outline-none focus:ring-1 focus:ring-ganshale-text/10'

const labelCls = 'text-xs font-medium text-ganshale-text'
const hintCls = 'text-[10px] leading-relaxed text-ganshale-subtle'

type FormState = {
  baseUrl: string
  apiKey: string
  apiKeyUsesDefault: boolean
  gatewayModelId: string
}

function configToForm(saved: LlmUserConfig, defaultBase: string): FormState {
  const usesDefaultKey = isBuiltinLlmApiKey(saved.apiKey)
  return {
    baseUrl: saved.baseUrl.trim() || defaultBase,
    apiKey: usesDefaultKey ? '' : saved.apiKey.trim(),
    apiKeyUsesDefault: usesDefaultKey,
    gatewayModelId: saved.gatewayModelId.trim() || DEFAULT_GATEWAY_MODEL_ID,
  }
}

function storedModelSnapshot(config: LlmUserConfig, defaultBase: string) {
  return normalizeLlmConfigForStorage(config, defaultBase)
}

function formToModelFields(form: FormState, defaultBase: string) {
  const gatewayModelId = form.gatewayModelId.trim() || DEFAULT_GATEWAY_MODEL_ID
  const baseUrl = form.baseUrl.trim()
  const normalizedBase = baseUrl === defaultBase ? '' : baseUrl
  return {
    baseUrl: normalizedBase,
    apiKey: form.apiKeyUsesDefault ? '' : form.apiKey.trim(),
    gatewayModelId,
    modelMap: { 'qwen3.5': gatewayModelId } as Partial<Record<DailyReportModelId, string>>,
  }
}

function resolveRuntimeFromForm(form: FormState, defaultBase: string) {
  const user = { ...loadLlmUserConfig(), ...formToModelFields(form, defaultBase) }
  return getLlmInvokeConfigForUser(user)
}

export function ModelConfigSettings() {
  const defaultBase = useMemo(() => describeDefaultLlmBaseUrl(), [])
  const [saved, setSaved] = useState<LlmUserConfig>(() => loadLlmUserConfig())
  const [form, setForm] = useState<FormState>(() => configToForm(loadLlmUserConfig(), defaultBase))
  const [note, setNote] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const otherModelsHint = useMemo(
    () =>
      DAILY_REPORT_MODELS.filter((m) => m.apiModel !== DEFAULT_GATEWAY_MODEL_ID)
        .map((m) => `${m.apiModel}`)
        .join('、'),
    [],
  )

  const dirty = useMemo(() => {
    const a = formToModelFields(form, defaultBase)
    const b = storedModelSnapshot(saved, defaultBase)
    return (
      a.baseUrl !== b.baseUrl ||
      a.apiKey !== b.apiKey ||
      a.gatewayModelId !== b.gatewayModelId
    )
  }, [form, saved, defaultBase])

  const applySave = useCallback(() => {
    const next = { ...loadLlmUserConfig(), ...formToModelFields(form, defaultBase) }
    saveLlmUserConfig(next)
    setSaved(loadLlmUserConfig())
    setForm(configToForm(next, defaultBase))
    setNote('已保存')
    setTestResult(null)
    window.setTimeout(() => setNote(null), 2000)
  }, [form, defaultBase])

  const cancelDraft = useCallback(() => {
    setForm(configToForm(saved, defaultBase))
    setNote(null)
    setTestResult(null)
  }, [saved, defaultBase])

  const runTest = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    setNote(null)
    try {
      const runtime = resolveRuntimeFromForm(form, defaultBase)
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
  }, [form, defaultBase])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const apiKeyInputValue = form.apiKeyUsesDefault ? API_KEY_MASK_DISPLAY : form.apiKey

  return (
    <section className="rounded-xl border border-ganshale-border bg-ganshale-surface p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-medium text-ganshale-text">
        <Bot className="h-4 w-4 text-ganshale-accent" strokeWidth={1.6} />
        模型配置
      </h3>

      <div className="mt-4 max-w-lg space-y-4 text-xs">
        <div className="space-y-1.5">
          <label htmlFor="llm-base-url" className={labelCls}>
            网关地址
          </label>
          <input
            id="llm-base-url"
            type="url"
            value={form.baseUrl}
            className={inputCls}
            onChange={(e) => setForm((s) => ({ ...s, baseUrl: e.target.value }))}
          />
          <p className={hintCls}>OpenAI 兼容接口根路径，须包含 /v1。</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="llm-api-key" className={labelCls}>
            API Key
          </label>
          <input
            id="llm-api-key"
            type="password"
            value={apiKeyInputValue}
            className={[inputCls, form.apiKeyUsesDefault ? 'tracking-widest text-ganshale-muted' : ''].join(
              ' ',
            )}
            autoComplete="off"
            spellCheck={false}
            onFocus={() => {
              if (form.apiKeyUsesDefault) {
                setForm((s) => ({ ...s, apiKeyUsesDefault: false, apiKey: '' }))
              }
            }}
            onChange={(e) => {
              const v = e.target.value
              if (v === API_KEY_MASK_DISPLAY) return
              setForm((s) => ({
                ...s,
                apiKeyUsesDefault: false,
                apiKey: v,
              }))
            }}
            onBlur={() => {
              setForm((s) => {
                if (!s.apiKey.trim()) {
                  return { ...s, apiKeyUsesDefault: true, apiKey: '' }
                }
                return s
              })
            }}
          />
          <p className={hintCls}>Key 以密文显示；聚焦后可修改，留空并失焦则恢复内置默认。</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="llm-gateway-model" className={labelCls}>
            模型 ID
          </label>
          <input
            id="llm-gateway-model"
            type="text"
            value={form.gatewayModelId}
            className={inputCls}
            onChange={(e) => setForm((s) => ({ ...s, gatewayModelId: e.target.value }))}
          />
          <p className={hintCls}>
            默认 <span className="font-mono text-ganshale-muted">{DEFAULT_GATEWAY_MODEL_ID}</span>
            。网关侧若已配置其他模型，可填写对应 id，例如：{otherModelsHint}。
          </p>
        </div>

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
            disabled={testing}
            onClick={() => void runTest()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-900 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : null}
            测试
          </button>
          {note ? <span className="text-[11px] text-ganshale-muted">{note}</span> : null}
        </div>

        {testResult ? (
          <p
            className={[
              'whitespace-pre-wrap rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed',
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
