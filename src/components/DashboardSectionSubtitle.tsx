import type { ReactNode } from 'react'

export function DashboardSectionSubtitle({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={[
        'mt-0.5 pl-6 text-[11px] leading-snug text-ganshale-muted sm:pl-[1.625rem]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  )
}
