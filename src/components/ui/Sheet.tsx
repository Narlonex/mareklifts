import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from './Button'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  /** Footer sits above the safe-area inset and stays reachable. */
  footer?: ReactNode
  /** Tall sheets are capped so the header never scrolls out of view. */
  size?: 'auto' | 'tall'
}

/**
 * Bottom sheet — the app's main modal surface on mobile.
 *
 * Constrained to the same 480px column as the app frame so it reads as part of
 * the phone UI rather than a desktop dialog.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'auto' }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-slate-950/45 backdrop-blur-[1px]"
      />
      <div className="relative flex w-full max-w-[480px] flex-col justify-end">
        <div
          className={cn(
            'animate-sheet-up overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift',
            size === 'tall' ? 'flex max-h-[92dvh] flex-col' : 'flex max-h-[88dvh] flex-col',
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-4 pt-3 pb-3">
            <div className="flex-1 pt-0.5">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              {title ? <h2 className="text-base font-bold text-ink">{title}</h2> : null}
              {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mt-1">
              <X className="size-5" />
            </IconButton>
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
          {footer ? (
            <div className="border-t border-line bg-surface px-4 pt-3 pb-3 pb-safe">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
