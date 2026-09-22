import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ProgressChart, type ChartMetric } from '../components/ProgressChart'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { StatTile } from '../components/ui/StatTile'
import { NAV_SPACER } from '../components/AppLayout'
import { cn } from '../lib/cn'
import { formatDate, formatVolume, pluralize } from '../lib/format'
import { formatWeight } from '../lib/units'
import { PR_LABELS } from '../lib/stats'
import { useAppStore } from '../store/useAppStore'
import { useExercise, useExerciseChart, useExerciseSessions, useExerciseTotals, usePR } from '../store/selectors'

export function ExerciseDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const unit = useAppStore((s) => s.user.unit)
  const activeWorkout = useAppStore((s) => s.activeWorkout)
  const addExerciseToWorkout = useAppStore((s) => s.addExerciseToWorkout)
  const exercise = useExercise(id)
  const totals = useExerciseTotals(id)
  const sessions = useExerciseSessions(id)
  const pr = usePR(id)
  const [metric, setMetric] = useState<ChartMetric>('weight')
  const chartData = useExerciseChart(id, metric)

  if (!exercise) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="Exercise" back />
        <div className="px-3 py-4">
          <EmptyState title="Exercise not found" message="It may have been deleted from your library." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title={exercise.name} subtitle={`${exercise.muscleGroup} · ${exercise.equipment}`} back />

      <main className="flex-1 space-y-5 px-3 py-3">
        <Card className="flex items-center gap-3 p-3.5">
          <ExerciseThumb exercise={exercise} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{exercise.name}</p>
            <p className="text-[12px] text-muted">
              {exercise.primaryMuscle}
              {exercise.secondaryMuscles.length > 0 ? ` · ${exercise.secondaryMuscles.join(', ')}` : ''}
            </p>
            <span className="mt-1.5 inline-flex gap-1.5 text-[11px] font-semibold">
              <span className="rounded-lg bg-accentsoft px-2 py-0.5 text-accent">{exercise.category}</span>
              <span className="rounded-lg bg-surface2 px-2 py-0.5 text-muted">{exercise.equipment}</span>
            </span>
          </div>
        </Card>

        <Card className="p-3.5">
          <p className="text-[11px] font-bold tracking-wide text-subtle uppercase">How to perform</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{exercise.instructions}</p>
        </Card>

        {totals && totals.timesPerformed > 0 ? (
          <>
            <section>
              <SectionHeader title="Lifetime stats" />
              <div className="grid grid-cols-2 gap-2.5">
                <StatTile
                  label="Heaviest"
                  value={totals.heaviest ? formatWeight(totals.heaviest.weightKg, unit) : '—'}
                  unit={totals.heaviest ? unit : undefined}
                />
                <StatTile
                  label="Est. 1RM"
                  value={totals.bestOneRm ? formatWeight(totals.bestOneRm, unit) : '—'}
                  unit={totals.bestOneRm ? unit : undefined}
                  tone="accent"
                />
                <StatTile label="Total volume" value={formatVolume(totals.totalVolumeKg, unit)} />
                <StatTile label="Sets logged" value={String(totals.totalWorkingSets)} />
              </div>
              <p className="mt-2 px-1 text-[12px] text-muted">
                {pluralize(totals.timesPerformed, 'session')}
                {totals.lastPerformed ? ` · last ${formatDate(totals.lastPerformed)}` : ''}
                {totals.bestSet
                  ? ` · best set ${formatWeight(totals.bestSet.weightKg, unit)} ${unit} × ${totals.bestSet.reps}`
                  : ''}
              </p>
            </section>

            {pr && pr.heaviest ? (
              <section>
                <SectionHeader title="Records" />
                <Card className="divide-y divide-line">
                  <RecordRow
                    label={PR_LABELS.weight}
                    value={`${formatWeight(pr.heaviest.weightKg, unit)} ${unit} × ${pr.heaviest.reps}`}
                  />
                  {pr.bestOneRm ? (
                    <RecordRow
                      label={PR_LABELS.oneRm}
                      value={`${formatWeight(pr.bestOneRm.value, unit)} ${unit}`}
                      detail={`from ${formatWeight(pr.bestOneRm.weightKg, unit)} ${unit} × ${pr.bestOneRm.reps}`}
                    />
                  ) : null}
                  {pr.bestVolume ? (
                    <RecordRow label={PR_LABELS.volume} value={formatVolume(pr.bestVolume.volumeKg, unit)} />
                  ) : null}
                  {Object.entries(pr.repsAtWeight).length > 0 ? (
                    <RecordRow
                      label={PR_LABELS.reps}
                      value={
                        Object.entries(pr.repsAtWeight)
                          .sort((a, b) => Number(b[0]) - Number(a[0]))
                          .slice(0, 3)
                          .map(([weight, entry]) => `${formatWeight(Number(weight), unit)}×${entry.reps}`)
                          .join('  ') || '—'
                      }
                      detail={`${unit} per weight`}
                    />
                  ) : null}
                </Card>
              </section>
            ) : null}

            <section>
              <SectionHeader title="Trend" />
              <Card className="p-3.5">
                <SegmentedControl<ChartMetric>
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'weight', label: 'Weight' },
                    { value: 'volume', label: 'Volume' },
                    { value: 'oneRm', label: 'Est. 1RM' },
                  ]}
                />
                <div className="mt-3">
                  <ProgressChart data={chartData} metric={metric} unit={unit} />
                </div>
              </Card>
            </section>

            <section>
              <SectionHeader title="Session history" />
              <div className="space-y-2.5">
                {[...sessions].reverse().map((session) => (
                  <Card key={session.workoutId} className="p-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/history/${session.workoutId}`)}
                        className="truncate text-[14px] font-bold text-ink"
                      >
                        {formatDate(session.date)}
                      </button>
                      <span className="tabular shrink-0 text-[12px] font-semibold text-muted">
                        {formatVolume(session.volumeKg, unit)}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {session.allSets.map((set) => (
                        <li
                          key={set.id}
                          className={cn(
                            'tabular flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px]',
                            set.type === 'warmup' ? 'bg-warnsoft/70' : 'bg-surface2',
                          )}
                        >
                          <span className="font-semibold text-ink">
                            {formatWeight(set.weightKg, unit)} {unit} × {set.reps}
                          </span>
                          {set.type === 'warmup' ? (
                            <span className="text-[10px] font-bold text-warn uppercase">Warm-up</span>
                          ) : null}
                          {set.type === 'failure' ? (
                            <span className="text-[10px] font-bold text-danger uppercase">Failure</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          </>
        ) : (
          <EmptyState
            title="No history for this exercise"
            message="Log it in a workout and your stats, records and charts will appear here."
          />
        )}

        {activeWorkout ? (
          <Button
            block
            size="lg"
            onClick={() => {
              addExerciseToWorkout(exercise.id)
              navigate('/workout/active')
            }}
          >
            <Plus className="size-4" />
            Add to current workout
          </Button>
        ) : null}

        <div className={NAV_SPACER} />
      </main>
    </div>
  )
}

function RecordRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {detail ? <span className="block text-[11px] text-subtle">{detail}</span> : null}
      </span>
      <span className="tabular shrink-0 text-sm font-bold text-ink">{value}</span>
    </div>
  )
}
