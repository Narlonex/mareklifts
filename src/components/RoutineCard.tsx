import { ChevronRight, Play, Settings2 } from 'lucide-react'
import type { Routine } from '../types'
import { Button } from './ui/Button'
import { useExerciseMap } from '../store/selectors'
import { pluralize } from '../lib/format'

export function RoutineCard({
  routine,
  onStart,
  onOpen,
}: {
  routine: Routine
  onStart: () => void
  onOpen: () => void
}) {
  const exerciseMap = useExerciseMap()
  const names = routine.exercises.map((re) => exerciseMap[re.exerciseId]?.name ?? 'Unknown')
  const totalSets = routine.exercises.reduce((sum, re) => sum + (re.targetSets ?? 3), 0)

  return (
    <section className="rounded-2xl border border-line bg-surface p-3 shadow-card">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[16px] font-bold text-ink">{routine.name}</span>
            <ChevronRight className="size-4 shrink-0 text-subtle" />
          </span>
          <span className="mt-0.5 block text-[12px] text-muted">
            {pluralize(routine.exercises.length, 'exercise')} · {totalSets} sets
          </span>
        </span>
      </button>

      {names.length > 0 ? (
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{names.join(' · ')}</p>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-subtle">No exercises yet — tap to edit.</p>
      )}

      <div className="mt-2.5 flex gap-2">
        <Button block onClick={onStart} disabled={routine.exercises.length === 0}>
          <Play className="size-4" />
          Start Routine
        </Button>
        <Button variant="secondary" onClick={onOpen} aria-label={`Edit ${routine.name}`}>
          <Settings2 className="size-4" />
        </Button>
      </div>
    </section>
  )
}

/** Compact chip used on Home for one-tap starts. */
export function RoutineChip({ routine, onStart }: { routine: Routine; onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={routine.exercises.length === 0}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink shadow-card active:bg-surface2 disabled:opacity-45"
    >
      <Play className="size-3.5 text-accent" />
      {routine.name}
    </button>
  )
}
