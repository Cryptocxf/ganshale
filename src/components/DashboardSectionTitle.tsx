import type { LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { pickRandomDashboardDescription } from '../lib/dashboardSectionDescriptions'

type DashboardSectionTitleProps = {
  icon: LucideIcon
  children: ReactNode
  suffix?: ReactNode
  id?: string
  className?: string
  /** 悬停时随机展示其中一条；也兼容单条 string */
  description?: string | readonly string[]
}

function normalizeDescriptionVariants(
  description?: string | readonly string[],
): readonly string[] {
  if (!description) return []
  if (typeof description === 'string') return description.trim() ? [description] : []
  return description
}

export function DashboardSectionTitle({
  icon: Icon,
  children,
  suffix,
  id,
  className = '',
  description,
}: DashboardSectionTitleProps) {
  const variants = useMemo(() => normalizeDescriptionVariants(description), [description])
  const [hoverTip, setHoverTip] = useState<string | undefined>()

  const onMouseEnter = useCallback(() => {
    setHoverTip(pickRandomDashboardDescription(variants))
  }, [variants])

  const onMouseLeave = useCallback(() => {
    setHoverTip(undefined)
  }, [])

  return (
    <h2
      id={id}
      title={hoverTip}
      onMouseEnter={variants.length > 0 ? onMouseEnter : undefined}
      onMouseLeave={variants.length > 0 ? onMouseLeave : undefined}
      className={['gs-section-title', variants.length > 0 ? 'cursor-help' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className="gs-section-title__icon" strokeWidth={1.8} aria-hidden />
      <span>{children}</span>
      {suffix}
    </h2>
  )
}
