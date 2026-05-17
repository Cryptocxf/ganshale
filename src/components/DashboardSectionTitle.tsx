import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type DashboardSectionTitleProps = {
  icon: LucideIcon
  children: ReactNode
  suffix?: ReactNode
  id?: string
  className?: string
}

export function DashboardSectionTitle({
  icon: Icon,
  children,
  suffix,
  id,
  className = '',
}: DashboardSectionTitleProps) {
  return (
    <h2
      id={id}
      className={[
        'flex flex-wrap items-center gap-x-2 gap-y-0.5 font-display text-sm font-bold text-ganshale-text',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon
        className="ml-1 h-3.5 w-3.5 shrink-0 text-ganshale-accent"
        strokeWidth={1.8}
        aria-hidden
      />
      <span>{children}</span>
      {suffix}
    </h2>
  )
}
