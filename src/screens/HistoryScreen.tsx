import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Search, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { WorkoutCard } from '../components/WorkoutCard'
import { EmptyState } from '../components/ui/EmptyState'
import { NAV_SPACER } from '../components/AppLayout'
import { useAppStore } from '../store/useAppStore'
import { useExerciseMap, useHistory } from '../store/selectors'
import { formatVolume, formatWeekLabel, startOfWeek, pluralize } from '../lib/format'
import { workoutVolumeKg, workoutWorkingSets } from '../lib/stats'

export function HistoryScreen() {
  const navigate = useNavigate()
  const unit = useAppStore((s) => s.user.unit)
  const allWorkouts = useHistory()
  const exerciseMap = useExerciseMap()
  const [query, setQuery] = useState('')

  const workouts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allWorkouts
    return allWorkouts.filter((w) => {
      if (w.name.toLowerCase().includes(q)) return true
      return w.exercises.some((we) => (exerciseMap[we.exerciseId]?.name ?? '').toLowerCase().includes(q))
    })
  }, [allWorkouts, query, exerciseMap])

  /** Grouped into weeks, newest first, with a per-week summary line. */
  const groups = useMemo(() => {
    const map = new Map<number, typeof workouts>()
    for (const workout of workouts) {
      const key = startOfWeek(workout.startedAt)
      const list = map.get(key)
      if (list) list.push(workout)
      else map.set(key, [workout])
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [workouts])

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="History" subtitle={pluralize(allWorkouts.length, 'workout')} back />

      <main className="flex-1 space-y-5 px-3 pt-3">
        {allWorkouts.length > 0 ? (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workouts or exercises"
              className="h-12 w-full rounded-2xl border border-line bg-surface pr-10 pl-9 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        {workouts.length === 0 ? (
          <EmptyState
            icon={<History className="size-6" />}
            title={allWorkouts.length === 0 ? 'No workouts yet' : 'No matches'}
            message={
              allWorkouts.length === 0
                ? 'Finished workouts land here with their full set-by-set detail.'
                : 'Try a different exercise or workout name.'
            }
          />
        ) : (
          groups.map(([weekStart, weekWorkouts]) => {
            const volume = weekWorkouts.reduce(
              (sum, w) => sum + (w.totalVolumeKg ?? workoutVolumeKg(w)),
              0,
            )
            const sets = weekWorkouts.reduce(
              (sum, w) => sum + (w.totalWorkingSets ?? workoutWorkingSets(w)),
              0,
            )
            return (
              <section key={weekStart}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-[13px] font-bold tracking-wide text-muted uppercase">
                    {formatWeekLabel(weekStart)}
                  </h2>
                  <span className="tabular text-[11px] font-semibold text-subtle">
                    {pluralize(weekWorkouts.length, 'workout')} · {pluralize(sets, 'set')} ·{' '}
                    {formatVolume(volume, unit)}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {weekWorkouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      unit={unit}
                      onOpen={() => navigate(`/history/${workout.id}`)}
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}

        <div className={NAV_SPACER} />
      </main>
    </div>
  )
}
