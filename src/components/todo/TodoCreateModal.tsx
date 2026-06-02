import { Plus, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { fromDatetimeLocalValue } from '../../lib/todoCountdown'
import {
  priorityLevelFromBand,
  TODO_TAG_OPTIONS,
  type TodoPriorityBand,
  type TodoTagId,
} from '../../lib/todoTags'
import { addTodo } from '../../lib/todoStore'
import { toYmdLocal } from '../../lib/timeutil'
import { GS_FIELD_INPUT_MD_CLASS, GS_MODAL_HEADER_DIVIDER_CLASS } from '../dashboardLayout'
import { DashboardModalRoot } from '../DashboardModalRoot'

const PRIORITY_OPTIONS: { id: TodoPriorityBand; label: string }[] = [
  { id: 'high', label: '高' },
  { id: 'medium', label: '中' },
  { id: 'low', label: '低' },
]

export function TodoCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TodoPriorityBand>('medium')
  const [tags, setTags] = useState<TodoTagId[]>(['work'])
  const [customTagInput, setCustomTagInput] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [reminderLocal, setReminderLocal] = useState('')

  const reset = () => {
    setTitle('')
    setPriority('medium')
    setTags(['work'])
    setCustomTagInput('')
    setDeadlineLocal('')
    setReminderLocal('')
  }

  const toggleTag = (id: TodoTagId) => {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const addCustomTag = () => {
    const trimmed = customTagInput.trim()
    if (!trimmed) return
    setTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    setCustomTagInput('')
  }

  const onCustomTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomTag()
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    const deadlineAt = fromDatetimeLocalValue(deadlineLocal)
    const reminderAt = fromDatetimeLocalValue(reminderLocal)
    addTodo({
      title: trimmed,
      scheduledDate: toYmdLocal(new Date()),
      deadlineAt,
      reminderAt,
      priority: priorityLevelFromBand(priority),
      tags,
    })
    handleClose()
  }

  if (!open) return null

  return (
    <DashboardModalRoot
      open
      onClose={handleClose}
      zIndex={90}
      labelledBy="todo-create-title"
      dialogClassName="w-full max-w-md"
    >
      <div className={`flex items-center justify-between px-4 py-3 ${GS_MODAL_HEADER_DIVIDER_CLASS}`}>
        <h2 id="todo-create-title" className="text-sm font-semibold text-ganshale-text">
          新建任务
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-1.5 text-ganshale-muted hover:bg-ganshale-page"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-4 py-3">
        <label className="block">
          <span className="text-[11px] font-medium text-ganshale-muted">标题</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入任务内容"
            className={`mt-1 ${GS_FIELD_INPUT_MD_CLASS}`}
          />
        </label>

        <fieldset>
          <legend className="text-[11px] font-medium text-ganshale-muted">优先级</legend>
          <div className="mt-2 flex gap-2">
            {PRIORITY_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setPriority(o.id)}
                className={[
                  'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition',
                  priority === o.id
                    ? 'border-ganshale-text bg-ganshale-text text-white'
                    : 'border-ganshale-border bg-ganshale-surface text-ganshale-text hover:bg-ganshale-elevated',
                ].join(' ')}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-medium text-ganshale-muted">标签</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TODO_TAG_OPTIONS.map((o) => {
              const on = tags.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleTag(o.id)}
                  className={[
                    'rounded-[10px] border px-2.5 py-1 text-[11px] font-medium transition',
                    on
                      ? 'border-ganshale-text bg-ganshale-elevated text-ganshale-text'
                      : 'border-ganshale-border bg-ganshale-surface text-ganshale-muted',
                  ].join(' ')}
                >
                  {o.label}
                </button>
              )
            })}
            {tags
              .filter((t) => !TODO_TAG_OPTIONS.some((o) => o.id === t))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="rounded-[10px] border border-ganshale-text bg-ganshale-elevated px-2.5 py-1 text-[11px] font-medium text-ganshale-text"
                >
                  {tag} ×
                </button>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={onCustomTagKeyDown}
              placeholder="自定义标签，回车添加"
              className={`min-w-0 flex-1 ${GS_FIELD_INPUT_MD_CLASS}`}
            />
            <button
              type="button"
              onClick={addCustomTag}
              disabled={!customTagInput.trim()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ganshale-border px-2.5 py-1.5 text-[11px] font-medium text-ganshale-text disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-[11px] font-medium text-ganshale-muted">截止时间</span>
          <input
            type="datetime-local"
            value={deadlineLocal}
            onChange={(e) => setDeadlineLocal(e.target.value)}
            className={`mt-1 ${GS_FIELD_INPUT_MD_CLASS}`}
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-medium text-ganshale-muted">提醒时间</span>
          <input
            type="datetime-local"
            value={reminderLocal}
            onChange={(e) => setReminderLocal(e.target.value)}
            className={`mt-1 ${GS_FIELD_INPUT_MD_CLASS}`}
          />
          <p className="mt-1 text-[10px] text-ganshale-muted">到达提醒时间后将弹出桌面提醒</p>
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-ganshale-border px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg border border-ganshale-border px-3 py-1.5 text-xs font-medium text-ganshale-text"
        >
          取消
        </button>
        <button
          type="button"
          disabled={!title.trim()}
          onClick={handleSubmit}
          className="rounded-lg bg-ganshale-text px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          创建
        </button>
      </div>
    </DashboardModalRoot>
  )
}
