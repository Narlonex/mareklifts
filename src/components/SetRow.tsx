import { Check } from 'lucide-react'
import type { SetType, Unit, WorkoutSet } from '../types'
import { NumberField } from './ui/NumberField'
import { cn } from '../lib/cn'
import { formatWeight, fromDisplayWeight, toDisplayWeight } from '../lib/units'
import { haptics, primeAudio } from '../lib/feedback'

/** Kept in one place so the column header and every row line up exactly. */
export const SET_GRID = 'grid grid-cols-[30px_56px_minmax(0,1fr)_50px_44px] items-center gap-1.5'

export interface SetRowProps {
  /** "W" for a warm-up, "F" for failure, otherwise the working-set number. */
  label: string
  set: WorkoutSet
  /** Same set index from the previous session, if there is one. */
  previous: { weightKg: number; reps: number } | null
  unit: Unit
  readOnly?: boolean
  onChangeWeight: (weightKg: number) => void
  onChangeReps: (reps: number) => void
  onToggle: () => void
  onOpenActions: () => void
}

export function SetRow({
  label,
  set,
  previous,
  unit,
  readOnly,
  onChangeWeight,
  onChangeReps,
  onToggle,
  onOpenActions,
}: SetRowProps) {
  const isWarmup = set.type === 'warmup'
  const isFailure = set.type === 'failure'
  const done = set.completed

  const previousLabel = !previous || isWarmup
    ? '—'
    : `${formatWeight(previous.weightKg, unit)}×${previous.reps}`

  return (
    <div
      className={cn(
        SET_GRID,
        'rounded-xl px-1.5 py-1 transition-colors',
        done && 'bg-successsoft',
        !done && isWarmup && 'bg-warnsoft/70',
        !done && isFailure && 'bg-dangersoft/60',
      )}
    >
      <button
        type="button"
        onClick={onOpenActions}
        aria-label={`Set ${label} options`}
        className={cn(
          'flex size-[30px] items-center justify-center rounded-lg border text-[12px] font-bold',
          isWarmup
            ? 'border-warn/40 bg-warnsoft text-warn'
            : isFailure
              ? 'border-danger/40 bg-dangersoft text-danger'
              : 'border-line bg-surface2 text-muted',
        )}
      >
        {label}
      </button>

      <span className="tabular truncate text-[11px] font-medium text-subtle">{previousLabel}</span>

      {/* The stored value is always kg; the field shows the active unit. */}
      <NumberField
        value={toDisplayWeight(set.weightKg, unit)}
        onChange={(value) => onChangeWeight(fromDisplayWeight(value, unit))}
        label={`Weight for set ${label}`}
        disabled={readOnly}
        placeholder={previous ? formatWeight(previous.weightKg, unit) : '—'}
      />

      <NumberField
        value={set.reps}
        onChange={onChangeReps}
        label={`Reps for set ${label}`}
        integer
        disabled={readOnly}
        placeholder={previous ? String(previous.reps) : '—'}
      />

      <button
        type="button"
        aria-label={done ? `Mark set ${label} not done` : `Complete set ${label}`}
        aria-pressed={done}
        disabled={readOnly}
        onClick={() => {
          primeAudio()
          if (!done) haptics.set()
          onToggle()
        }}
        className={cn(
          'flex size-11 items-center justify-center rounded-xl border transition-colors',
          done
            ? 'border-success/40 bg-success text-onaccent'
            : 'border-linestrong bg-surface text-linestrong active:bg-surface2',
          readOnly && 'opacity-60',
        )}
      >
        <Check className={cn('size-5', done ? 'opacity-100' : 'opacity-30')} strokeWidth={3} />
      </button>
    </div>
  )
}

export function SetTableHeader() {
  return (
    <div className={cn(SET_GRID, 'px-1.5 pb-1')}>
      <span className="text-center text-[10px] font-bold tracking-wide text-subtle uppercase">Set</span>
      <span className="text-[10px] font-bold tracking-wide text-subtle uppercase">Prev</span>
      <span className="text-center text-[10px] font-bold tracking-wide text-subtle uppercase">Weight</span>
      <span className="text-center text-[10px] font-bold tracking-wide text-subtle uppercase">Reps</span>
      <span className="text-center text-[10px] font-bold tracking-wide text-subtle uppercase">✓</span>
    </div>
  )
}

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Warm-up',
  normal: 'Working set',
  failure: 'Failure',
}
