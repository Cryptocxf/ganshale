import { useCallback, useEffect, useRef, useState } from 'react'
import { setAppDisplayNameOverride } from '../lib/appDisplayNameStore'

type EditableAppDisplayNameProps = {
  identityKey: string
  displayName: string
  className?: string
}

export function EditableAppDisplayName({
  identityKey,
  displayName,
  className = '',
}: EditableAppDisplayNameProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(displayName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(displayName)
  }, [displayName, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = useCallback(() => {
    setAppDisplayNameOverride(identityKey, draft)
    setEditing(false)
  }, [identityKey, draft])

  const cancel = useCallback(() => {
    setDraft(displayName)
    setEditing(false)
  }, [displayName])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        className={[
          'gs-field-input h-6 min-w-0 max-w-full rounded px-1 py-0 text-[11px] font-medium',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="编辑应用显示名"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={[
        'min-w-0 truncate text-left text-[11px] font-medium text-ganshale-text',
        'rounded px-0.5 transition hover:bg-ganshale-page hover:underline',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title="点击编辑显示名（全局生效）"
    >
      {displayName}
    </button>
  )
}
