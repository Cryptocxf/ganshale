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
} from '../lib/windowDwellPromptConfig'
import {
  WORK_RECORDS_UPDATED_EVENT,
  appendManualWorkRecord,
} from '../lib/workRecordStore'
import { identityFromEventData } from '../lib/windowAppDisplay'
import {
  GS_FIELD_INPUT_MD_CLASS,
  GS_MODAL_HEADER_DIVIDER_CLASS,
} from './dashboardLayout'
import { DashboardModalRoot } from './DashboardModalRoot'

type PromptState = {
  event: AwEvent
  milestoneSec: number
  draft: string
}

function appLabel(ev: AwEvent): string {
  return identityFromEventData(ev.data).displayName || '应用'
}

export function WindowDwellPrompt() {
  const {
    ready,
    day,
    windowEvents,
    liveForeground,
    windowTrackingActive,
    windowTrackingPaused,
    collectionPausedByUser,
  } = useGanshaleData()

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [prompt, setPrompt] = useState<PromptState | null>(null)
  const [idleTick, setIdleTick] = useState(0)
  const [hovering, setHovering] = useState(false)

  const firedRef = useRef<Set<string>>(new Set())
  const prevSegmentEventIdRef = useRef<string | null>(null)
  const lastIdleAtRef = useRef(0)
  const draftRef = useRef('')

  const extrapolate = Boolean(
    ready && windowTrackingActive && !windowTrackingPaused && !collectionPausedByUser,
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
    if (!windowTrackingActive || windowTrackingPaused || collectionPausedByUser) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1500)
    return () => clearInterval(id)
  }, [windowTrackingActive, windowTrackingPaused, collectionPausedByUser])

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
      if (t) {
        appendManualWorkRecord(day, t)
        try {
          window.dispatchEvent(new CustomEvent(WORK_RECORDS_UPDATED_EVENT))
        } catch {
          /* ignore */
        }
      }
      setHovering(false)
      return null
    })
  }, [day])

  useEffect(() => {
    if (!ready || !liveSeg.event || prompt) return
    const { event, seconds } = liveSeg
    for (const m of WINDOW_DWELL_PROMPT_MILESTONES_SEC) {
      if (seconds < m) break
      const key = `${event.id}:${m}`
      if (firedRef.current.has(key)) continue
      firedRef.current.add(key)
      draftRef.current = ''
      lastIdleAtRef.current = Date.now()
      setHovering(false)
      setPrompt({ event, milestoneSec: m, draft: '' })
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
    if (!prompt || hovering) return
    void idleTick
    if (Date.now() - lastIdleAtRef.current >= WINDOW_DWELL_IDLE_CLOSE_MS) {
      closeAndSave()
    }
  }, [prompt, hovering, idleTick, closeAndSave])

  const onInputActivity = useCallback(() => {
    lastIdleAtRef.current = Date.now()
  }, [])

  const onDialogMouseEnter = useCallback(() => {
    setHovering(true)
  }, [])

  const onDialogMouseLeave = useCallback(() => {
    setHovering(false)
    lastIdleAtRef.current = Date.now()
  }, [])

  const idleLeftSec = useMemo(() => {
    if (!prompt || hovering) return null
    void idleTick
    return Math.max(
      0,
      Math.ceil(
        (WINDOW_DWELL_IDLE_CLOSE_MS - (Date.now() - lastIdleAtRef.current)) / 1000,
      ),
    )
  }, [prompt, hovering, idleTick])

  if (!prompt) return null

  const titleShort = String(prompt.event.data.title ?? '').trim() || '（无标题）'

  return (
    <DashboardModalRoot
      open
      onClose={closeAndSave}
      zIndex={110}
      dismissOnBackdrop={false}
      labelledBy="dwell-prompt-title"
      overlayClassName="items-end justify-end p-2 sm:p-3"
      dialogClassName="w-full max-w-[20rem]"
    >
      <div onMouseEnter={onDialogMouseEnter} onMouseLeave={onDialogMouseLeave}>
        <div
          className={`flex items-start justify-between gap-1.5 px-2.5 py-2 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}
        >
          <div className="min-w-0">
            <h2
              id="dwell-prompt-title"
              className="font-display text-xs font-semibold leading-snug text-ganshale-text"
            >
              已连续使用「{appLabel(prompt.event)}」{formatDuration(prompt.milestoneSec)}
            </h2>
            <p className="mt-0.5 text-[10px] leading-snug text-ganshale-muted">
              {hovering
                ? '鼠标移开后 10 秒自动关闭'
                : idleLeftSec != null
                  ? `无操作 ${idleLeftSec}s 后关闭`
                  : '无操作 10s 后关闭'}
              {' · '}
              有内容将写入今日工作记录
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
            工作记录
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
            placeholder="记点什么…（可选，将写入今日工作记录）"
            className={`w-full resize-y rounded-lg px-2 py-1.5 text-[11px] leading-relaxed ${GS_FIELD_INPUT_MD_CLASS}`}
          />
        </div>
      </div>
    </DashboardModalRoot>
  )
}
