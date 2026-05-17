import { X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useGanshaleData } from '../context/useGanshaleData'
import type { AwEvent } from '../lib/awTypes'
import {
  currentForegroundSegmentLive,
  formatDuration,
} from '../lib/aggregations'
import {
  WINDOW_DWELL_IDLE_CLOSE_MS,
  WINDOW_DWELL_PROMPT_MILESTONES_SEC,
  WINDOW_REMARKS_UPDATED_EVENT,
} from '../lib/windowDwellPromptConfig'
import { loadWindowRemarks, upsertWindowRemark } from '../lib/windowRemarksStore'

type PromptState = {
  event: AwEvent
  milestoneSec: number
  draft: string
}

function appLabel(ev: AwEvent): string {
  return String(ev.data.app ?? '').replace(/\.exe$/i, '') || '应用'
}

export function WindowDwellPrompt() {
  const {
    ready,
    windowEvents,
    liveForeground,
    windowTrackingActive,
    collectionPausedByUser,
  } = useGanshaleData()

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [prompt, setPrompt] = useState<PromptState | null>(null)
  const [idleTick, setIdleTick] = useState(0)

  const firedRef = useRef<Set<string>>(new Set())
  const prevSegmentEventIdRef = useRef<string | null>(null)
  const lastInputAtRef = useRef(0)
  const draftRef = useRef('')

  const extrapolate = Boolean(
    ready && windowTrackingActive && !collectionPausedByUser,
  )

  const liveSeg = useMemo(
    () =>
      currentForegroundSegmentLive(
        windowEvents,
        liveForeground,
        nowMs,
        extrapolate,
      ),
    [windowEvents, liveForeground, nowMs, extrapolate],
  )

  const liveSegmentId = liveSeg.event?.id

  useEffect(() => {
    if (!windowTrackingActive || collectionPausedByUser) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1500)
    return () => clearInterval(id)
  }, [windowTrackingActive, collectionPausedByUser])

  useEffect(() => {
    const id = liveSeg.event?.id ?? null
    if (id === null) return
    if (id !== prevSegmentEventIdRef.current) {
      prevSegmentEventIdRef.current = id
      firedRef.current = new Set()
    }
  }, [liveSeg.event?.id])

  const closeAndSave = useCallback(() => {
    setPrompt((p) => {
      if (!p) return null
      const t = draftRef.current.trim()
      if (t) upsertWindowRemark(p.event.id, t)
      try {
        window.dispatchEvent(new CustomEvent(WINDOW_REMARKS_UPDATED_EVENT))
      } catch {
        /* ignore */
      }
      return null
    })
  }, [])

  useEffect(() => {
    if (!ready || !liveSeg.event || prompt) return
    const { event, seconds } = liveSeg
    for (const m of WINDOW_DWELL_PROMPT_MILESTONES_SEC) {
      if (seconds < m) break
      const key = `${event.id}:${m}`
      if (firedRef.current.has(key)) continue
      firedRef.current.add(key)
      const initial = loadWindowRemarks()[event.id] ?? ''
      draftRef.current = initial
      lastInputAtRef.current = Date.now()
      setPrompt({ event, milestoneSec: m, draft: initial })
      break
    }
  }, [ready, liveSeg.event?.id, liveSeg.seconds, prompt])

  useEffect(() => {
    if (!prompt) return
    if (!liveSegmentId || liveSegmentId !== prompt.event.id) {
      closeAndSave()
    }
  }, [liveSegmentId, prompt, closeAndSave])

  useEffect(() => {
    if (!prompt) return
    const id = window.setInterval(() => setIdleTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [prompt])

  useEffect(() => {
    if (!prompt) return
    void idleTick
    if (Date.now() - lastInputAtRef.current >= WINDOW_DWELL_IDLE_CLOSE_MS) {
      closeAndSave()
    }
  }, [prompt, idleTick, closeAndSave])

  const onInputActivity = useCallback(() => {
    lastInputAtRef.current = Date.now()
  }, [])

  const idleLeftSec = useMemo(() => {
    if (!prompt) return 0
    void idleTick
    return Math.max(
      0,
      Math.ceil(
        (WINDOW_DWELL_IDLE_CLOSE_MS - (Date.now() - lastInputAtRef.current)) / 1000,
      ),
    )
  }, [prompt, idleTick])

  if (!prompt) return null

  const titleShort = String(prompt.event.data.title ?? '').trim() || '（无标题）'

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-end bg-black/40 p-2 sm:p-3"
      role="presentation"
    >
      <div
        className="flex w-full max-w-[20rem] flex-col rounded-xl border border-black/[0.08] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dwell-prompt-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-1.5 border-b border-black/[0.06] px-2.5 py-2">
          <div className="min-w-0">
            <h2
              id="dwell-prompt-title"
              className="font-display text-xs font-semibold leading-snug text-ganshale-text"
            >
              已连续使用「{appLabel(prompt.event)}」{formatDuration(prompt.milestoneSec)}
            </h2>
            <p className="mt-0.5 text-[10px] leading-snug text-ganshale-muted">
              无操作 {idleLeftSec}s 后关闭 · 备注会保存到本条窗口记录
            </p>
          </div>
          <button
            type="button"
            onClick={closeAndSave}
            className="shrink-0 rounded-full p-1.5 text-ganshale-muted transition hover:bg-ganshale-page hover:text-ganshale-text"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        <div className="space-y-1.5 px-2.5 py-2">
          <p className="text-[11px] leading-relaxed text-ganshale-text">
            <span className="font-medium text-ganshale-muted">窗口：</span>
            <span className="break-words">{titleShort}</span>
          </p>
          <label htmlFor="dwell-prompt-note" className="sr-only">
            备注
          </label>
          <textarea
            id="dwell-prompt-note"
            rows={2}
            value={prompt.draft}
            onChange={(e) => {
              const v = e.target.value
              draftRef.current = v
              onInputActivity()
              setPrompt((p) => (p ? { ...p, draft: v } : p))
            }}
            onKeyDown={onInputActivity}
            onPointerDown={onInputActivity}
            onFocus={onInputActivity}
            placeholder="记点什么…（可选，将写入该条记录的备注）"
            className="w-full resize-y rounded-lg border border-black/[0.08] bg-ganshale-page/40 px-2 py-1.5 text-[11px] leading-relaxed text-ganshale-text placeholder:text-ganshale-subtle focus:border-ganshale-text/25 focus:outline-none focus:ring-2 focus:ring-ganshale-text/10"
          />
        </div>
      </div>
    </div>
  )
}
