import { memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  DEADLINE_PRESET_OPTIONS,
  REMINDER_PRESET_OPTIONS,
  deadlineIsoFromPreset,
  reminderIsoFromPreset,
  type DeadlinePresetId,
  type ReminderPresetId,
} from '../../lib/todoTimePresets'
import { addTodo, type TodoPriorityLevel } from '../../lib/todoStore'
import { toYmdLocal } from '../../lib/timeutil'
import { GS_FIELD_INPUT_MD_CLASS } from '../dashboardLayout'
import { TodoStarRating } from './TodoStarRating'

const SELECT_CLASS = `${GS_FIELD_INPUT_MD_CLASS} w-full min-w-[7.5rem] max-w-[10rem]`

export type TodoQuickCaptureOptionsHandle = {
  buildPayload: (title: string) => Parameters<typeof addTodo>[0]
  resetOptions: () => void
}

const TodoQuickCaptureToolbar = memo(function TodoQuickCaptureToolbar({
  canSave,
  onSubmit,
  optionsRef,
}: {
  canSave: boolean
  onSubmit: () => void
  optionsRef: React.RefObject<TodoQuickCaptureOptionsHandle | null>
}) {
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePresetId>('none')
  const [deadlineCustom, setDeadlineCustom] = useState('')
  const [reminderPreset, setReminderPreset] = useState<ReminderPresetId>('none')
  const [reminderCustom, setReminderCustom] = useState('')
  const [priority, setPriority] = useState<TodoPriorityLevel>(1)

  const resetOptions = useCallback(() => {
    setDeadlinePreset('none')
    setDeadlineCustom('')
    setReminderPreset('none')
    setReminderCustom('')
    setPriority(1)
  }, [])

  const buildPayload = useCallback(
    (title: string) => {
      const deadlineAt = deadlineIsoFromPreset(deadlinePreset, deadlineCustom)
      return {
        title,
        scheduledDate: toYmdLocal(new Date()),
        deadlineAt,
        reminderAt: reminderIsoFromPreset(reminderPreset, reminderCustom, deadlineAt),
        priority,
      }
    },
    [deadlinePreset, deadlineCustom, reminderPreset, reminderCustom, priority],
  )

  useImperativeHandle(
    optionsRef,
    () => ({
      buildPayload,
      resetOptions,
    }),
    [buildPayload, resetOptions],
  )

  return (
    <div
      className="mt-2 flex w-full shrink-0 flex-wrap items-center justify-start gap-x-4 gap-y-2 border-t border-ganshale-border/80 pt-2.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2">
        <span className="shrink-0 text-left text-[11px] font-medium text-ganshale-muted">
          完成时间
        </span>
        <select
          value={deadlinePreset}
          onChange={(e) => setDeadlinePreset(e.target.value as DeadlinePresetId)}
          className={SELECT_CLASS}
          aria-label="完成时间"
        >
          {DEADLINE_PRESET_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {deadlinePreset === 'custom' ? (
          <input
            type="datetime-local"
            value={deadlineCustom}
            onChange={(e) => setDeadlineCustom(e.target.value)}
            className={[GS_FIELD_INPUT_MD_CLASS, 'min-w-[10.5rem]'].join(' ')}
            aria-label="自定义完成时间"
          />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2">
        <span className="shrink-0 text-left text-[11px] font-medium text-ganshale-muted">
          提醒时间
        </span>
        <select
          value={reminderPreset}
          onChange={(e) => setReminderPreset(e.target.value as ReminderPresetId)}
          className={SELECT_CLASS}
          aria-label="提醒时间"
        >
          {REMINDER_PRESET_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {reminderPreset === 'custom' ? (
          <input
            type="datetime-local"
            value={reminderCustom}
            onChange={(e) => setReminderCustom(e.target.value)}
            className={[GS_FIELD_INPUT_MD_CLASS, 'min-w-[10.5rem]'].join(' ')}
            aria-label="自定义提醒时间"
          />
        ) : null}
      </div>

      <div
        className={[
          'flex shrink-0 items-center justify-start gap-2 rounded-lg border border-amber-300/70',
          'bg-gradient-to-br from-amber-50 to-orange-50/90 px-3 py-2 shadow-sm',
          'ring-1 ring-amber-200/50',
        ].join(' ')}
      >
        <span className="shrink-0 text-left text-[11px] font-semibold tracking-wide text-amber-950/85">
          优先等级
        </span>
        <TodoStarRating value={priority} onChange={setPriority} size="lg" emphasized />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSave}
        className="ml-auto inline-flex shrink-0 items-center rounded-lg bg-ganshale-text px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
      >
        保存
      </button>
    </div>
  )
})

/** 非受控输入区：按键不触发工具栏重渲染 */
function TodoQuickCaptureEditor({
  inputRef,
  onCanSaveChange,
  onSubmitRequest,
  autoFocus,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onCanSaveChange: (can: boolean) => void
  onSubmitRequest: () => void
  autoFocus: boolean
}) {
  const canSaveRef = useRef(false)

  const syncCanSave = useCallback(() => {
    const can = (inputRef.current?.value.trim().length ?? 0) > 0
    if (can === canSaveRef.current) return
    canSaveRef.current = can
    onCanSaveChange(can)
  }, [inputRef, onCanSaveChange])

  useEffect(() => {
    if (!autoFocus) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [autoFocus, inputRef])

  const focusEditor = useCallback(() => {
    inputRef.current?.focus()
  }, [inputRef])

  return (
    <div
      className="relative min-h-0 flex-1 cursor-text"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('textarea')) return
        e.preventDefault()
        focusEditor()
      }}
    >
      <textarea
        ref={inputRef}
        defaultValue=""
        onInput={syncCanSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmitRequest()
          }
        }}
        placeholder="点击空白处开始输入…  Enter 保存，Shift+Enter 换行"
        className={[
          'absolute inset-0 box-border h-full w-full resize-none border-0 bg-transparent p-0',
          'text-sm leading-relaxed text-ganshale-text placeholder:text-ganshale-subtle',
          'focus:outline-none',
        ].join(' ')}
      />
    </div>
  )
}

export function TodoQuickCapture({ autoFocus = true }: { autoFocus?: boolean }) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const optionsRef = useRef<TodoQuickCaptureOptionsHandle | null>(null)
  const [canSave, setCanSave] = useState(false)

  const submit = useCallback(() => {
    const title = inputRef.current?.value.trim() ?? ''
    const options = optionsRef.current
    if (!title || !options) return
    addTodo(options.buildPayload(title))
    if (inputRef.current) inputRef.current.value = ''
    setCanSave(false)
    options.resetOptions()
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TodoQuickCaptureEditor
        inputRef={inputRef}
        autoFocus={autoFocus}
        onCanSaveChange={setCanSave}
        onSubmitRequest={submit}
      />
      <TodoQuickCaptureToolbar
        canSave={canSave}
        onSubmit={submit}
        optionsRef={optionsRef}
      />
    </div>
  )
}
