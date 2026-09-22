/**
 * Derived data hooks.
 *
 * Nothing here is stored — every value is folded out of `history` on demand and
 * memoized against the array identity, which zustand only changes when the
 * history actually changes.
 */

import { useMemo } from 'react'
import type { Exercise, MuscleGroup, PRRecord } from '../types'
import { useAppStore } from './useAppStore'
import { SEED_EXERCISES, MUSCLE_TO_GROUP } from '../data/seedExercises'
import {
  exerciseChartSeries,
  exerciseSessions,
  exerciseTotals,
  historyTotals,
  muscleGroupStats,
  performedExerciseIds,
  prForExercise,
  previousPerformance,
  rankExercisesByFrequency,
  recentExerciseIds,
  weeklyStats,
  type ExerciseSession,
  type ExerciseTotals,
  type HistoryTotals,
  type MuscleGroupStat,
  type PreviousPerformance,
  type WeekStat,
} from '../lib/stats'

export function useHistory() {
  return useAppStore((s) => s.history)
}

export function useCustomExercises() {
  return useAppStore((s) => s.customExercises)
}

/** Every exercise the user can pick: their own first, then the seed database. */
export function useAllExercises(): Exercise[] {
  const custom = useCustomExercises()
  return useMemo(() => [...custom, ...SEED_EXERCISES], [custom])
}

export function useExerciseMap(): Record<string, Exercise> {
  const all = useAllExercises()
  return useMemo(() => {
    const map: Record<string, Exercise> = {}
    for (const e of all) map[e.id] = e
    return map
  }, [all])
}

export function useExercise(id: string | undefined | null): Exercise | undefined {
  const map = useExerciseMap()
  return id ? map[id] : undefined
}

export function useExerciseName(id: string): string {
  const exercise = useExercise(id)
  return exercise?.name ?? 'Unknown exercise'
}

/** Muscle-group lookup for a logged exercise id. */
export function useMuscleGroupResolver() {
  const map = useExerciseMap()
  return useMemo(
    () => (exerciseId: string): MuscleGroup | undefined => map[exerciseId]?.muscleGroup,
    [map],
  )
}

/** Last session's sets for an exercise — powers the "Previous" column. */
export function usePreviousPerformance(exerciseId: string | null | undefined): PreviousPerformance | null {
  const history = useHistory()
  return useMemo(
    () => (exerciseId ? previousPerformance(history, exerciseId) : null),
    [history, exerciseId],
  )
}

export function useExerciseTotals(exerciseId: string | null | undefined): ExerciseTotals | null {
  const history = useHistory()
  return useMemo(
    () => (exerciseId ? exerciseTotals(history, exerciseId) : null),
    [history, exerciseId],
  )
}

export function useExerciseSessions(exerciseId: string | null | undefined): ExerciseSession[] {
  const history = useHistory()
  return useMemo(
    () => (exerciseId ? exerciseSessions(history, exerciseId) : []),
    [history, exerciseId],
  )
}

export function useExerciseChart(
  exerciseId: string | null | undefined,
  metric: 'weight' | 'volume' | 'oneRm',
) {
  const history = useHistory()
  return useMemo(
    () => (exerciseId ? exerciseChartSeries(history, exerciseId, metric) : []),
    [history, exerciseId, metric],
  )
}

export function usePR(exerciseId: string | null | undefined): PRRecord | null {
  const history = useHistory()
  return useMemo(
    () => (exerciseId ? prForExercise(history, exerciseId) : null),
    [history, exerciseId],
  )
}

export function useMuscleStats(since?: number): MuscleGroupStat[] {
  const history = useHistory()
  const resolve = useMuscleGroupResolver()
  return useMemo(() => muscleGroupStats(history, resolve, { since }), [history, resolve, since])
}

export function useHistoryTotals(): HistoryTotals {
  const history = useHistory()
  return useMemo(() => historyTotals(history), [history])
}

export function useWeeklyStats(weeks: number): WeekStat[] {
  const history = useHistory()
  return useMemo(() => weeklyStats(history, weeks), [history, weeks])
}

export function usePerformedExerciseIds(): string[] {
  const history = useHistory()
  return useMemo(() => performedExerciseIds(history), [history])
}

export function useRankedExercises(): { exerciseId: string; sessions: number }[] {
  const history = useHistory()
  return useMemo(() => rankExercisesByFrequency(history), [history])
}

export function useRecentExerciseIds(limit = 12): string[] {
  const history = useHistory()
  return useMemo(() => recentExerciseIds(history, limit), [history, limit])
}

/**
 * Baseline PRs for the live in-workout toast. Finished workouts only, so the
 * set currently being logged is never compared against itself.
 */
export function useBaselinePR(exerciseId: string | null | undefined): PRRecord | null {
  return usePR(exerciseId)
}

export { MUSCLE_TO_GROUP }
