import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { ExerciseThumb } from './ExerciseThumb'
import { EmptyState } from './ui/EmptyState'
import { cn } from '../lib/cn'
import { pluralize } from '../lib/format'
import { useExerciseMap, useRankedExercises } from '../store/selectors'

/**
 * Picks an exercise the user has actually trained — used by Progress so the
 * list is ranked by frequency instead of showing the whole library.
 */
export function PerformedExercisePicker({
  open,
  onClose,
  selectedId,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  selectedId: string | null
  onSelect: (exerciseId: string) => void
}) {
  const ranked = useRankedExercises()
  const exerciseMap = useExerciseMap()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ranked
    return ranked.filter((r) => (exerciseMap[r.exerciseId]?.name ?? '').toLowerCase().includes(q))
  }, [ranked, query, exerciseMap])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Choose exercise"
      subtitle={pluralize(ranked.length, 'exercise', 'exercises') + ' logged'}
    >
      <div className="space-y-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your exercises"
            className="h-12 w-full rounded-2xl border border-line bg-surface2 pr-3 pl-9 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
          />
        </div>

        {results.length === 0 ? (
          <EmptyState title="No exercises logged yet" message="Complete a workout to unlock progress tracking." />
        ) : (
          <ul className="space-y-1.5">
            {results.map(({ exerciseId, sessions }) => {
              const exercise = exerciseMap[exerciseId]
              if (!exercise) return null
              const active = exerciseId === selectedId
              return (
                <li key={exerciseId}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(exerciseId)
                      onClose()
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors',
                      active ? 'border-accent bg-accentsoft' : 'border-line bg-surface active:bg-surface2',
                    )}
                  >
                    <ExerciseThumb exercise={exercise} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{exercise.name}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {exercise.primaryMuscle} · {sessions} session{sessions === 1 ? '' : 's'}
                      </span>
                    </span>
                    {active ? <Check className="size-5 shrink-0 text-accent" strokeWidth={3} /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
