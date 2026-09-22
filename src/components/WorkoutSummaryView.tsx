import { Clock, Dumbbell, Flame, Trophy } from 'lucide-react'
import type { Unit, Workout } from '../types'
import { StatTile } from './ui/StatTile'
import { Card, SectionHeader } from './ui/Card'
import { useExerciseMap, useMuscleGroupResolver } from '../store/selectors'
import { formatDuration, formatVolume, pluralize } from '../lib/format'
import { formatWeight } from '../lib/units'
import {
  PR_LABELS,
  isWorkingSet,
  muscleGroupStats,
  workoutExerciseCount,
  workoutVolumeKg,
  workoutWarmupSets,
  workoutWorkingSets,
} from '../lib/stats'

export function WorkoutSummaryView({
  workout,
  unit,
  showPrs = true,
}: {
  workout: Workout
  unit: Unit
  showPrs?: boolean
}) {
  const exerciseMap = useExerciseMap()
  const resolveGroup = useMuscleGroupResolver()
  const volume = workout.totalVolumeKg ?? workoutVolumeKg(workout)
  const sets = workout.totalWorkingSets ?? workoutWorkingSets(workout)
  const warmups = workoutWarmupSets(workout)
  const breakdown = muscleGroupStats([workout], resolveGroup)
  const maxSets = Math.max(1, ...breakdown.map((b) => b.sets))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Duration" value={formatDuration(workout.durationSec ?? 0)} icon={<Clock className="size-3.5" />} />
        <StatTile label="Volume" value={formatVolume(volume, unit)} tone="accent" />
        <StatTile label="Working sets" value={String(sets)} />
        <StatTile
          label="Exercises"
          value={String(workoutExerciseCount(workout))}
          icon={<Dumbbell className="size-3.5" />}
        />
      </div>

      {warmups > 0 ? (
        <p className="px-1 text-[12px] text-subtle">
          {pluralize(warmups, 'warm-up set')} excluded from volume, statistics and PRs.
        </p>
      ) : null}

      {showPrs && (workout.prsAchieved?.length ?? 0) > 0 ? (
        <section>
          <SectionHeader title="Personal records" />
          <Card className="divide-y divide-line">
            {workout.prsAchieved!.map((pr, i) => {
              const previous =
                pr.previousValue === null
                  ? 'First time logged'
                  : pr.kind === 'reps'
                    ? `was ${pr.previousValue} reps`
                    : pr.kind === 'volume'
                      ? `was ${formatVolume(pr.previousValue, unit)}`
                      : `was ${formatWeight(pr.previousValue, unit)} ${unit}`

              const main =
                pr.kind === 'reps'
                  ? `${pr.reps} reps @ ${formatWeight(pr.weightKg, unit)} ${unit}`
                  : pr.kind === 'volume'
                    ? `${formatVolume(pr.value, unit)} total`
                    : pr.kind === 'oneRm'
                      ? `${formatWeight(pr.value, unit)} ${unit} est. 1RM`
                      : `${formatWeight(pr.weightKg, unit)} ${unit} × ${pr.reps}`

              return (
                <div key={`${pr.exerciseId}-${pr.kind}-${i}`} className="flex items-center gap-3 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-prsoft text-pr">
                    <Trophy className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {exerciseMap[pr.exerciseId]?.name ?? 'Exercise'}
                    </span>
                    <span className="block text-[12px] text-muted">{PR_LABELS[pr.kind]}</span>
                  </span>
                  <span className="tabular shrink-0 text-right">
                    <span className="block text-sm font-bold text-ink">{main}</span>
                    <span className="block text-[11px] text-subtle">{previous}</span>
                  </span>
                </div>
              )
            })}
          </Card>
        </section>
      ) : null}

      {breakdown.length > 0 ? (
        <section>
          <SectionHeader title="Muscle groups" />
          <Card className="space-y-2.5 p-3.5">
            {breakdown.map((b) => (
              <div key={b.group} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[13px] font-semibold text-ink">{b.group}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${(b.sets / maxSets) * 100}%` }}
                  />
                </span>
                <span className="tabular w-14 shrink-0 text-right text-[12px] font-semibold text-muted">
                  {pluralize(b.sets, 'set')}
                </span>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Exercises" />
        <div className="space-y-2.5">
          {workout.exercises.map((we) => {
            const exercise = exerciseMap[we.exerciseId]
            const working = we.sets.filter(isWorkingSet)
            return (
              <Card key={we.id} className="p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate text-[15px] font-bold text-ink">
                    {exercise?.name ?? 'Unknown exercise'}
                  </h3>
                  <span className="tabular shrink-0 text-[11px] font-semibold text-muted">
                    {working.length} working
                  </span>
                </div>
                {exercise ? (
                  <p className="mt-0.5 text-[11.5px] text-subtle">
                    {exercise.primaryMuscle} · {exercise.equipment}
                  </p>
                ) : null}

                <ul className="mt-2 space-y-1">
                  {we.sets.map((set) => (
                    <li
                      key={set.id}
                      className="tabular flex items-center gap-2 rounded-lg bg-surface2 px-2.5 py-1.5 text-[13px]"
                    >
                      {set.type === 'warmup' ? (
                        <Flame className="size-3.5 shrink-0 text-warn" />
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="font-semibold text-ink">
                        {formatWeight(set.weightKg, unit)} {unit} × {set.reps}
                      </span>
                      {set.type === 'failure' ? (
                        <span className="text-[10px] font-bold text-danger uppercase">Failure</span>
                      ) : null}
                      {set.type === 'warmup' ? (
                        <span className="text-[10px] font-bold text-warn uppercase">Warm-up</span>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {we.notes ? (
                  <p className="mt-2 rounded-xl bg-surface2 px-2.5 py-1.5 text-[12px] text-muted">{we.notes}</p>
                ) : null}
              </Card>
            )
          })}
        </div>
      </section>

      {workout.notes ? (
        <section>
          <SectionHeader title="Workout note" />
          <Card className="p-3.5 text-[13px] text-muted">{workout.notes}</Card>
        </section>
      ) : null}
    </div>
  )
}
