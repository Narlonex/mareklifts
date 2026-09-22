import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function StatTile({
  label,
  value,
  unit,
  icon,
  tone = 'default',
  className,
}: {
  label: string
  value: string
  unit?: string
  icon?: ReactNode
  tone?: 'default' | 'accent' | 'pr' | 'success'
  className?: string
}) {
  const toneClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'pr'
        ? 'text-pr'
        : tone === 'success'
          ? 'text-success'
          : 'text-ink'

  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-3 shadow-card', className)}>
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px] font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <div className={cn('mt-1 flex items-baseline gap-1', toneClass)}>
        <span className="tabular text-xl leading-none font-bold">{value}</span>
        {unit ? <span className="text-xs font-semibold text-muted">{unit}</span> : null}
      </div>
    </div>
  )
}

export function KeyValueRow({
  label,
  value,
  valueClassName,
}: {
  label: ReactNode
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className={cn('tabular text-sm font-semibold text-ink', valueClassName)}>{value}</span>
    </div>
  )
}
