import { Flame, Trash2, TrendingUp, Zap } from 'lucide-react'
import type { SetType, WorkoutSet } from '../types'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'
import { SET_TYPE_LABELS } from './SetRow'

const OPTIONS: { type: SetType; icon: typeof Flame; description: string }[] = [
  { type: 'warmup', icon: Flame, description: 'Excluded from volume, stats and PRs' },
  { type: 'normal', icon: TrendingUp, description: 'Counts toward volume and PRs' },
  { type: 'failure', icon: Zap, description: 'Taken to technical failure' },
]

export function SetActionSheet({
  open,
  onClose,
  set,
  label,
  onSetType,
  onDelete,
}: {
  open: boolean
  onClose: () => void
  set: WorkoutSet | null
  label?: string
  onSetType: (type: SetType) => void
  onDelete: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={label ? `Set ${label}` : 'Set'} subtitle="Set type and options">
      <div className="space-y-2">
        {OPTIONS.map(({ type, icon: Icon, description }) => {
          const active = set?.type === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                onSetType(type)
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                active ? 'border-accent bg-accentsoft' : 'border-line bg-surface active:bg-surface2',
              )}
            >
              <Icon className={cn('size-5 shrink-0', active ? 'text-accent' : 'text-muted')} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{SET_TYPE_LABELS[type]}</span>
                <span className="block text-[12px] text-muted">{description}</span>
              </span>
              {active ? <span className="text-[11px] font-bold text-accent uppercase">Current</span> : null}
            </button>
          )
        })}
      </div>

      <Button
        variant="danger"
        block
        className="mt-4"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        <Trash2 className="size-4" />
        Delete set
      </Button>
    </Sheet>
  )
}
