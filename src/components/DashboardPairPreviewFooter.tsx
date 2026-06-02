import type { ReactNode } from 'react'

export function DashboardPairPreviewFooter({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-ganshale-border bg-ganshale-page/60 px-2 py-1.5 text-center text-[10px] leading-snug text-ganshale-subtle sm:px-2.5">
      {children}
    </p>
  )
}
