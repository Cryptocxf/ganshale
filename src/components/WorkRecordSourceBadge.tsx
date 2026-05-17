import { PenLine, Sparkles } from 'lucide-react'
import type { WorkRecordSource } from '../lib/workRecordStore'

const badgeCls =
  'inline-flex shrink-0 items-center justify-center rounded border p-0.5 leading-none'

export function WorkRecordSourceBadge({
  source,
  saved,
}: {
  source: WorkRecordSource
  saved: boolean
}) {
  if (source === 'manual' && saved) {
    return (
      <span
        className={`${badgeCls} border-sky-200/90 bg-sky-50 text-sky-900`}
        title="手动记录"
        aria-label="手动记录"
      >
        <PenLine className="h-3 w-3" strokeWidth={2} aria-hidden />
      </span>
    )
  }
  if (source === 'system') {
    return (
      <span
        className={`${badgeCls} border-violet-200/90 bg-violet-50 text-violet-900`}
        title="AI总结"
        aria-label="AI总结"
      >
        <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
      </span>
    )
  }
  return null
}
