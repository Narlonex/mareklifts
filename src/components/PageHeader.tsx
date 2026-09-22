import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from './ui/Button'
import { cn } from '../lib/cn'

export function PageHeader({
  title,
  subtitle,
  back,
  right,
  className,
  large,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** true for history-back, or a path to navigate to explicitly. */
  back?: boolean | string
  right?: ReactNode
  className?: string
  large?: boolean
}) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-line bg-canvas/90 pt-safe backdrop-blur-lg',
        className,
      )}
    >
      <div className="flex min-h-14 items-center gap-1.5 px-2">
        {back ? (
          <IconButton
            label="Go back"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          >
            <ChevronLeft className="size-6" />
          </IconButton>
        ) : (
          <span className="w-1" />
        )}
        <div className="min-w-0 flex-1 px-0.5">
          <h1
            className={cn(
              'truncate font-bold text-ink',
              large ? 'text-[22px] leading-tight' : 'text-[17px]',
            )}
          >
            {title}
          </h1>
          {subtitle ? <div className="truncate text-[12px] text-muted">{subtitle}</div> : null}
        </div>
        {right}
      </div>
    </header>
  )
}
