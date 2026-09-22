import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-8 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-2.5 text-subtle">{icon}</div> : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 max-w-[34ch] text-[13px] text-muted">{message}</p> : null}
      {action ? <div className="mt-4 w-full max-w-[260px]">{action}</div> : null}
    </div>
  )
}
