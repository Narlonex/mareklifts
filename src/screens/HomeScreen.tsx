import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Dumbbell, Flame, Play, Plus, TrendingUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useHistory } from '../store/selectors'
import { PageHeader } from '../components/PageHeader'
import { RoutineChip } from '../components/RoutineCard'
import { WorkoutCard } from '../components/WorkoutCard'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { StatTile } from '../components/ui/StatTile'
import { NAV_SPACER } from '../components/AppLayout'
import { cn } from '../lib/cn'
import { formatClock, formatVolume, pluralize, startOfDay } from '../lib/format'
import { workoutVolumeKg, workoutWorkingSets, weeklyStats } from '../lib/stats'
import { useWorkoutClock } from '../hooks/useTimers'

export function HomeScreen() {
  const navigate = useNavigate()
  const name = useAppStore((s) => s.user.name)
  const unit = useAppStore((s) => s.user.unit)
  const routines = useAppStore((s) => s.routines)
  const activeWorkout = useAppStore((s) => s.activeWorkout)
  const startEmpty = useAppStore((s) => s.startEmptyWorkout)
  const startFromRoutine = useAppStore((s) => s.startFromRoutine)
  const history = useHistory()
  const elapsed = useWorkoutClock()

  const thisWeek = useMemo(() => weeklyStats(history, 1)[0], [history])

  /** Last seven days as a training-days strip. */
  const lastSeven = useMemo(() => {
    const today = startOfDay(Date.now())
    const days = Array.from({ length: 7 }, (_, i) => {
      const ts = today - (6 - i) * 86400000
      const trained = history.some((w) => startOfDay(w.startedAt) === ts)
      return { ts, trained }
    })
    return days
  }, [history])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const activeSets = activeWorkout ? workoutWorkingSets(activeWorkout) : 0
  const activeVolume = activeWorkout ? workoutVolumeKg(activeWorkout) : 0

  const handleStartRoutine = (routineId: string) => {
    if (activeWorkout) {
      navigate('/workout')
      return
    }
    startFromRoutine(routineId)
    navigate('/workout/active')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        large
        title={`${greeting}${name ? `, ${name}` : ''}`}
        subtitle={
          thisWeek && thisWeek.workouts > 0
            ? `${pluralize(thisWeek.workouts, 'workout')} this week`
            : 'Ready to train?'
        }
      />

      <main className="flex-1 space-y-5 px-3 pt-3">
        {activeWorkout ? (
          <button
            type="button"
            onClick={() => navigate('/workout/active')}
            className="w-full rounded-2xl border border-accent/40 bg-accentsoft p-3.5 text-left active:brightness-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-onaccent">
                <Play className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold tracking-wide text-accent uppercase">
                  Workout in progress
                </span>
                <span className="block truncate text-[17px] font-bold text-ink">{activeWorkout.name}</span>
                <span className="tabular block text-[12px] text-muted">
                  {formatClock(elapsed)} · {pluralize(activeSets, 'set')} · {formatVolume(activeVolume, unit)}
                </span>
              </span>
            </div>
          </button>
        ) : (
          <Button size="lg" block onClick={() => {
            startEmpty()
            navigate('/workout/active')
          }}>
            <Dumbbell className="size-5" />
            Start Empty Workout
          </Button>
        )}

        {routines.length > 0 ? (
          <section>
            <SectionHeader
              title="Start a routine"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/workout')}
                  className="flex items-center gap-0.5 text-[13px] font-bold text-accent"
                >
                  All routines
                  <ChevronRight className="size-4" />
                </button>
              }
            />
            <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
              {routines.map((routine) => (
                <RoutineChip key={routine.id} routine={routine} onStart={() => handleStartRoutine(routine.id)} />
              ))}
              <button
                type="button"
                onClick={() => navigate('/routines/new')}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-linestrong px-3 text-[13px] font-semibold text-muted"
              >
                <Plus className="size-3.5" />
                New
              </button>
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeader title="This week" />
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              label="Workouts"
              value={String(thisWeek?.workouts ?? 0)}
              icon={<Flame className="size-3.5" />}
            />
            <StatTile
              label="Volume"
              value={formatVolume(thisWeek?.volumeKg ?? 0, unit)}
              tone="accent"
            />
          </div>

          <Card className="mt-2.5 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-muted">Active days</p>
              <p className="tabular text-[12px] font-bold text-ink">
                {lastSeven.filter((d) => d.trained).length}/7
              </p>
            </div>
            <div className="mt-2.5 flex justify-between gap-1.5">
              {lastSeven.map((day) => (
                <div key={day.ts} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      'h-8 w-full rounded-lg',
                      day.trained ? 'bg-accent' : 'bg-surface2 ring-1 ring-line ring-inset',
                    )}
                  />
                  <span className="text-[10px] font-semibold text-subtle">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(day.ts).getDay()]}
                  </span>
                </div>
              ))}
            </div>
            <p className="tabular mt-2.5 text-[12px] text-muted">
              {pluralize(thisWeek?.workingSets ?? 0, 'working set')} logged this week
            </p>
          </Card>
        </section>

        <section>
          <SectionHeader
            title="Recent activity"
            action={
              history.length > 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="flex items-center gap-0.5 text-[13px] font-bold text-accent"
                >
                  History
                  <ChevronRight className="size-4" />
                </button>
              ) : null
            }
          />
          {history.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-6" />}
              title="Your log is empty"
              message="Start a workout above. Every set you complete builds your history, PRs and progress charts."
            />
          ) : (
            <div className="space-y-2.5">
              {history.slice(0, 3).map((workout) => (
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
    </div>
  )
}
