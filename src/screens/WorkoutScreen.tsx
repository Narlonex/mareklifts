import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Dumbbell, Play, Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useHistory } from '../store/selectors'
import { PageHeader } from '../components/PageHeader'
import { RoutineCard } from '../components/RoutineCard'
import { WorkoutCard } from '../components/WorkoutCard'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { NAV_SPACER } from '../components/AppLayout'
import { formatClock, formatVolume, pluralize } from '../lib/format'
import { workoutVolumeKg, workoutWorkingSets } from '../lib/stats'
import { useWorkoutClock } from '../hooks/useTimers'

export function WorkoutScreen() {
  const navigate = useNavigate()
  const routines = useAppStore((s) => s.routines)
  const activeWorkout = useAppStore((s) => s.activeWorkout)
  const unit = useAppStore((s) => s.user.unit)
  const startEmpty = useAppStore((s) => s.startEmptyWorkout)
  const startFromRoutine = useAppStore((s) => s.startFromRoutine)
  const cancelActiveWorkout = useAppStore((s) => s.cancelActiveWorkout)
  const history = useHistory()
  const elapsed = useWorkoutClock()

  const [pending, setPending] = useState<{ kind: 'empty' } | { kind: 'routine'; id: string } | null>(null)

  const begin = (target: { kind: 'empty' } | { kind: 'routine'; id: string }) => {
    if (target.kind === 'empty') startEmpty()
    else startFromRoutine(target.id)
    navigate('/workout/active')
  }

  const handleStart = (target: { kind: 'empty' } | { kind: 'routine'; id: string }) => {
    // Never silently throw away an in-progress session.
    if (activeWorkout) {
      setPending(target)
      return
    }
    begin(target)
  }

  const recent = history.slice(0, 4)
  const activeSets = activeWorkout ? workoutWorkingSets(activeWorkout) : 0
  const activeVolume = activeWorkout ? workoutVolumeKg(activeWorkout) : 0

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader large title="Workout" subtitle="Log fast, tap once per set" />

      <main className="flex-1 space-y-5 px-3 pt-3">
        {activeWorkout ? (
          <Card className="border-accent/40 bg-accentsoft p-3.5">
            <p className="text-[11px] font-bold tracking-wide text-accent uppercase">In progress</p>
            <p className="mt-0.5 truncate text-[17px] font-bold text-ink">{activeWorkout.name}</p>
            <p className="tabular mt-0.5 text-[12px] text-muted">
              {formatClock(elapsed)} · {pluralize(activeSets, 'set')} · {formatVolume(activeVolume, unit)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button block onClick={() => navigate('/workout/active')}>
                <Play className="size-4" />
                Resume Workout
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPending({ kind: 'empty' })
                }}
              >
                Replace
              </Button>
            </div>
          </Card>
        ) : (
          <Button size="lg" block onClick={() => handleStart({ kind: 'empty' })}>
            <Dumbbell className="size-5" />
            Start Empty Workout
          </Button>
        )}

        <section>
          <SectionHeader
            title="Routines"
            action={
              <button
                type="button"
                onClick={() => navigate('/routines/new')}
                className="flex items-center gap-1 text-[13px] font-bold text-accent"
              >
                <Plus className="size-4" />
                New Routine
              </button>
            }
          />
          {routines.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="size-6" />}
              title="No routines yet"
              message="Group the exercises you train together, then start them in one tap."
              action={
                <Button block onClick={() => navigate('/routines/new')}>
                  <Plus className="size-4" />
                  Create routine
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onStart={() => handleStart({ kind: 'routine', id: routine.id })}
                  onOpen={() => navigate(`/routines/${routine.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            title="Recent workouts"
            action={
              history.length > 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="flex items-center gap-0.5 text-[13px] font-bold text-accent"
                >
                  View all
                  <ChevronRight className="size-4" />
                </button>
              ) : null
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="No workouts logged yet"
              message="Finish your first session and it will show up here with duration, sets and volume."
            />
          ) : (
            <div className="space-y-2.5">
              {recent.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  unit={unit}
                  onOpen={() => navigate(`/history/${workout.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        <div className={NAV_SPACER} />
      </main>

      <ConfirmDialog
        open={pending !== null}
        title="Unfinished workout"
        message="You already have a workout in progress. Starting a new one will discard the sets you've logged so far."
        confirmLabel="Discard & start"
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const target = pending
          cancelActiveWorkout()
          setPending(null)
          if (target) begin(target)
        }}
      />
    </div>
  )
}
