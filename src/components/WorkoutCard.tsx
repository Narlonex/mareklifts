import { ChevronRight, Clock, Dumbbell, Trophy } from 'lucide-react'
import type { Unit, Workout } from '../types'
import { formatDate, formatDuration, formatVolume, pluralize } from '../lib/format'
import { workoutExerciseCount, workoutVolumeKg, workoutWorkingSets } from '../lib/stats'

export function WorkoutCard({
  workout,
  unit,
  onOpen,
}: {
  workout: Workout
  unit: Unit
  onOpen: () => void
}) {
  const volume = workout.totalVolumeKg ?? workoutVolumeKg(workout)
  const sets = workout.totalWorkingSets ?? workoutWorkingSets(workout)
  const exercises = workoutExerciseCount(workout)
  const prCount = workout.prsAchieved?.length ?? 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-card active:bg-surface2"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-ink">{workout.name}</span>
          {prCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-prsoft px-1.5 py-0.5 text-[10px] font-bold text-pr uppercase">
              <Trophy className="size-3" />
              {prCount}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[12px] font-medium text-muted">{formatDate(workout.startedAt)}</span>
        <span className="tabular mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDuration(workout.durationSec ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="size-3.5" />
            {pluralize(exercises, 'exercise')}
          </span>
          <span>{pluralize(sets, 'set')}</span>
          <span className="font-semibold text-ink">{formatVolume(volume, unit)}</span>
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-subtle" />
    </button>
  )
}
