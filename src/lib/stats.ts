/**
 * Pure analytics + personal-record engine.
 *
 * Everything here is derived from completed workout history — nothing is
 * cached in state, so History and Progress can never drift apart.
 *
 * Counting rules (stated in the UI):
 *  - Only COMPLETED sets count.
 *  - WARM-UP sets are excluded from volume, working-set counts, muscle-group
 *    statistics and PR detection. They still render in history.
 *  - A working set is therefore: completed && type !== 'warmup'.
 */

import type {
  Exercise,
  MuscleGroup,
  PRHit,
  PRKind,
  PRRecord,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types'
import { startOfWeek } from './format'

export const DEFAULT_REST_SECONDS = 120
export const REST_PRESETS = [60, 90, 120, 180] as const

export function isWorkingSet(set: WorkoutSet): boolean {
  return set.completed && set.type !== 'warmup'
}

export function isCompleted(set: WorkoutSet): boolean {
  return set.completed
}

/** Session volume for one exercise, in kg. Warm-ups excluded. */
export function exerciseVolumeKg(we: WorkoutExercise): number {
  return we.sets.reduce(
    (sum, s) => (isWorkingSet(s) ? sum + s.weightKg * s.reps : sum),
    0,
  )
}

/** Whole-workout volume, in kg. Warm-ups excluded. */
export function workoutVolumeKg(workout: Workout): number {
  return workout.exercises.reduce((sum, we) => sum + exerciseVolumeKg(we), 0)
}

/** Completed working sets across the whole workout. */
export function workoutWorkingSets(workout: Workout): number {
  return workout.exercises.reduce(
    (sum, we) => sum + we.sets.filter(isWorkingSet).length,
    0,
  )
}

export function workoutWarmupSets(workout: Workout): number {
  return workout.exercises.reduce(
    (sum, we) => sum + we.sets.filter((s) => s.completed && s.type === 'warmup').length,
    0,
  )
}

/** Exercises that have at least one completed set. */
export function workoutExerciseCount(workout: Workout): number {
  return workout.exercises.filter((we) => we.sets.some(isCompleted)).length
}

/**
 * Estimated one-rep max (Epley).
 *
 * `w * (1 + r/30)`. Reps are clamped to 20 because the formula diverges wildly
 * above that, and a single rep is by definition its own 1RM.
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + Math.min(reps, 20) / 30)
}

export interface TopSet {
  weightKg: number
  reps: number
}

/** Heaviest working set: weight first, reps as the tie-breaker. */
export function topSet(sets: WorkoutSet[]): TopSet | null {
  const working = sets.filter(isWorkingSet)
  if (working.length === 0) return null
  return working.reduce((best, s) => {
    if (s.weightKg > best.weightKg) return { weightKg: s.weightKg, reps: s.reps }
    if (s.weightKg === best.weightKg && s.reps > best.reps) return { weightKg: s.weightKg, reps: s.reps }
    return best
  }, { weightKg: working[0].weightKg, reps: working[0].reps })
}

/** Highest estimated 1RM working set. */
export function bestSetByOneRm(sets: WorkoutSet[]): (TopSet & { oneRm: number }) | null {
  const working = sets.filter(isWorkingSet)
  if (working.length === 0) return null
  let best: TopSet & { oneRm: number } = {
    weightKg: working[0].weightKg,
    reps: working[0].reps,
    oneRm: epley1RM(working[0].weightKg, working[0].reps),
  }
  for (const s of working) {
    const oneRm = epley1RM(s.weightKg, s.reps)
    if (oneRm > best.oneRm) best = { weightKg: s.weightKg, reps: s.reps, oneRm }
  }
  return best
}

/** Storage key for the "best reps at this weight" table (rounded to 0.5 kg). */
export function weightKey(weightKg: number): string {
  return String(Math.round(weightKg * 2) / 2)
}

// ------------------------------------------------------------------ sessions

export interface ExerciseSession {
  workoutId: string
  workoutName: string
  date: number
  durationSec: number | null
  /** Working sets, in logged order. */
  sets: TopSet[]
  /** All sets including warm-ups, for history rendering. */
  allSets: WorkoutSet[]
  volumeKg: number
  topSet: TopSet | null
  bestOneRm: number | null
}

/** Every session that contained this exercise, oldest first. */
export function exerciseSessions(workouts: Workout[], exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = []
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (we.exerciseId !== exerciseId) continue
      if (!we.sets.some(isCompleted)) continue
      out.push({
        workoutId: w.id,
        workoutName: w.name,
        date: w.startedAt,
        durationSec: w.durationSec ?? null,
        sets: we.sets.filter(isWorkingSet).map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
        allSets: we.sets,
        volumeKg: exerciseVolumeKg(we),
        topSet: topSet(we.sets),
        bestOneRm: bestSetByOneRm(we.sets)?.oneRm ?? null,
      })
    }
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface PreviousPerformance {
  date: number
  workoutId: string
  workoutName: string
  sets: TopSet[]
}

/**
 * The most recent PRIOR session for an exercise — this is what powers the
 * "Previous: 55 kg x 8" column so a set can be logged with a single tap.
 */
export function previousPerformance(
  workouts: Workout[],
  exerciseId: string,
  opts: { before?: number; excludeWorkoutId?: string } = {},
): PreviousPerformance | null {
  const sessions = exerciseSessions(workouts, exerciseId).filter((s) => {
    if (opts.excludeWorkoutId && s.workoutId === opts.excludeWorkoutId) return false
    if (opts.before !== undefined && s.date >= opts.before) return false
    return true
  })
  const last = sessions[sessions.length - 1]
  if (!last) return null
  // Prefer the working sets; fall back to whatever was logged so a warm-up-only
  // session still gives the user a number to beat.
  const sets = last.sets.length > 0 ? last.sets : last.allSets.map((s) => ({ weightKg: s.weightKg, reps: s.reps }))
  return {
    date: last.date,
    workoutId: last.workoutId,
    workoutName: last.workoutName,
    sets,
  }
}

// ---------------------------------------------------------------- totals/PRs

export interface ExerciseTotals {
  exerciseId: string
  timesPerformed: number
  totalVolumeKg: number
  totalWorkingSets: number
  heaviest: TopSet | null
  bestSet: (TopSet & { oneRm: number }) | null
  /** Best estimated 1RM across all sessions. */
  bestOneRm: number | null
  lastPerformed: number | null
}

export function emptyPR(exerciseId: string): PRRecord {
  return {
    exerciseId,
    heaviest: null,
    bestOneRm: null,
    bestVolume: null,
    repsAtWeight: {},
  }
}

/** Fold one session into a PR record. */
export function accumulatePR(pr: PRRecord, sets: WorkoutSet[], date: number): PRRecord {
  const next: PRRecord = {
    exerciseId: pr.exerciseId,
    heaviest: pr.heaviest,
    bestOneRm: pr.bestOneRm,
    bestVolume: pr.bestVolume,
    repsAtWeight: { ...pr.repsAtWeight },
  }
  let volume = 0
  for (const s of sets) {
    if (!isWorkingSet(s)) continue
    volume += s.weightKg * s.reps
    const heavy = next.heaviest
    if (
      !heavy ||
      s.weightKg > heavy.weightKg ||
      (s.weightKg === heavy.weightKg && s.reps > heavy.reps)
    ) {
      next.heaviest = { weightKg: s.weightKg, reps: s.reps, date }
    }
    const oneRm = epley1RM(s.weightKg, s.reps)
    if (!next.bestOneRm || oneRm > next.bestOneRm.value) {
      next.bestOneRm = { value: oneRm, weightKg: s.weightKg, reps: s.reps, date }
    }
    const key = weightKey(s.weightKg)
    const existing = next.repsAtWeight[key]
    if (!existing || s.reps > existing.reps) {
      next.repsAtWeight[key] = { reps: s.reps, date }
    }
  }
  if (volume > 0 && (!next.bestVolume || volume > next.bestVolume.volumeKg)) {
    next.bestVolume = { volumeKg: volume, date }
  }
  return next
}

/** PR record for a single exercise across (optionally restricted) workouts. */
export function prForExercise(
  workouts: Workout[],
  exerciseId: string,
  opts: { before?: number } = {},
): PRRecord {
  let pr = emptyPR(exerciseId)
  const ordered = [...workouts].sort((a, b) => a.startedAt - b.startedAt)
  for (const w of ordered) {
    if (opts.before !== undefined && w.startedAt >= opts.before) continue
    for (const we of w.exercises) {
      if (we.exerciseId !== exerciseId) continue
      pr = accumulatePR(pr, we.sets, w.startedAt)
    }
  }
  return pr
}

export function exerciseTotals(workouts: Workout[], exerciseId: string): ExerciseTotals {
  const sessions = exerciseSessions(workouts, exerciseId)
  const pr = prForExercise(workouts, exerciseId)
  return {
    exerciseId,
    timesPerformed: sessions.length,
    totalVolumeKg: sessions.reduce((sum, s) => sum + s.volumeKg, 0),
    totalWorkingSets: sessions.reduce((sum, s) => sum + s.sets.length, 0),
    heaviest: pr.heaviest ? { weightKg: pr.heaviest.weightKg, reps: pr.heaviest.reps } : null,
    bestSet: pr.bestOneRm
      ? {
          weightKg: pr.bestOneRm.weightKg,
          reps: pr.bestOneRm.reps,
          oneRm: pr.bestOneRm.value,
        }
      : null,
    bestOneRm: pr.bestOneRm?.value ?? null,
    lastPerformed: sessions.length ? sessions[sessions.length - 1].date : null,
  }
}

/**
 * Compare a workout against all prior training and report which records fell.
 * Called once on finish; results are cached on the saved workout.
 */
export function detectPrs(workout: Workout, priorWorkouts: Workout[]): PRHit[] {
  const hits: PRHit[] = []
  for (const we of workout.exercises) {
    const sets = we.sets.filter(isWorkingSet)
    if (sets.length === 0) continue
    const baseline = prForExercise(priorWorkouts, we.exerciseId)

    // Heaviest weight.
    const heaviest = sets.reduce((best, s) =>
      s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps) ? s : best,
    )
    if (!baseline.heaviest || heaviest.weightKg > baseline.heaviest.weightKg) {
      hits.push({
        exerciseId: we.exerciseId,
        kind: 'weight',
        weightKg: heaviest.weightKg,
        reps: heaviest.reps,
        value: heaviest.weightKg,
        previousValue: baseline.heaviest?.weightKg ?? null,
      })
    }

    // Estimated 1RM.
    const bestOneRmSet = bestSetByOneRm(sets)!
    if (!baseline.bestOneRm || bestOneRmSet.oneRm > baseline.bestOneRm.value) {
      hits.push({
        exerciseId: we.exerciseId,
        kind: 'oneRm',
        weightKg: bestOneRmSet.weightKg,
        reps: bestOneRmSet.reps,
        value: bestOneRmSet.oneRm,
        previousValue: baseline.bestOneRm?.value ?? null,
      })
    }

    // Best reps at a weight — report the single biggest improvement.
    let repHit: { s: WorkoutSet; previous: number | null; gain: number } | null = null
    for (const s of sets) {
      const prev = baseline.repsAtWeight[weightKey(s.weightKg)]
      if (prev && s.reps > prev.reps) {
        const gain = s.reps - prev.reps
        if (!repHit || gain > repHit.gain) repHit = { s, previous: prev.reps, gain }
      }
    }
    if (repHit) {
      hits.push({
        exerciseId: we.exerciseId,
        kind: 'reps',
        weightKg: repHit.s.weightKg,
        reps: repHit.s.reps,
        value: repHit.s.reps,
        previousValue: repHit.previous,
      })
    }

    // Best single-session volume.
    const volume = exerciseVolumeKg(we)
    if (volume > 0 && (!baseline.bestVolume || volume > baseline.bestVolume.volumeKg)) {
      hits.push({
        exerciseId: we.exerciseId,
        kind: 'volume',
        weightKg: heaviest.weightKg,
        reps: sets.length,
        value: volume,
        previousValue: baseline.bestVolume?.volumeKg ?? null,
      })
    }
  }
  return hits
}

/**
 * Live PR check for a single set, used for the in-workout "New PR!" toast.
 * Returns the kinds of record this set just broke.
 */
export function setBreaksRecords(set: WorkoutSet, baseline: PRRecord): PRKind[] {
  const kinds: PRKind[] = []
  if (!set.completed || set.type === 'warmup' || set.reps <= 0 || set.weightKg <= 0) return kinds
  if (!baseline.heaviest || set.weightKg > baseline.heaviest.weightKg) kinds.push('weight')
  const reps = baseline.repsAtWeight[weightKey(set.weightKg)]
  if (reps && set.reps > reps.reps) kinds.push('reps')
  const oneRm = epley1RM(set.weightKg, set.reps)
  if (!baseline.bestOneRm || oneRm > baseline.bestOneRm.value) kinds.push('oneRm')
  return kinds
}

export const PR_LABELS: Record<PRKind, string> = {
  weight: 'Heaviest weight',
  reps: 'Best reps at weight',
  oneRm: 'Estimated 1RM',
  volume: 'Best volume',
}

// ------------------------------------------------------------------ groupings

export interface MuscleGroupStat {
  group: MuscleGroup
  sets: number
  volumeKg: number
}

/**
 * Working sets per muscle group. A set is credited to the exercise's PRIMARY
 * group only, so the totals sum exactly to the logged working sets.
 */
export function muscleGroupStats(
  workouts: Workout[],
  groupOf: (exerciseId: string) => MuscleGroup | undefined,
  opts: { since?: number } = {},
): MuscleGroupStat[] {
  const acc = new Map<MuscleGroup, MuscleGroupStat>()
  for (const w of workouts) {
    if (opts.since !== undefined && w.startedAt < opts.since) continue
    for (const we of w.exercises) {
      const group = groupOf(we.exerciseId)
      if (!group) continue
      let stat = acc.get(group)
      if (!stat) {
        stat = { group, sets: 0, volumeKg: 0 }
        acc.set(group, stat)
      }
      for (const s of we.sets) {
        if (!isWorkingSet(s)) continue
        stat.sets += 1
        stat.volumeKg += s.weightKg * s.reps
      }
    }
  }
  // Deterministic ordering: most sets, then most volume, then name.
  return [...acc.values()].sort(
    (a, b) => b.sets - a.sets || b.volumeKg - a.volumeKg || a.group.localeCompare(b.group),
  )
}

export interface WeekStat {
  /** Monday 00:00 of the week. */
  weekStart: number
  workouts: number
  workingSets: number
  volumeKg: number
}

/** Per-week aggregates for the last `weeks` weeks, oldest first. */
export function weeklyStats(workouts: Workout[], weeks: number, now = Date.now()): WeekStat[] {
  const buckets: WeekStat[] = []
  const currentWeek = startOfWeek(now)
  const byWeek = new Map<number, WeekStat>()
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = currentWeek - i * 7 * 86400000
    const stat: WeekStat = { weekStart, workouts: 0, workingSets: 0, volumeKg: 0 }
    buckets.push(stat)
    byWeek.set(weekStart, stat)
  }
  for (const w of workouts) {
    const stat = byWeek.get(startOfWeek(w.startedAt))
    if (!stat) continue
    stat.workouts += 1
    stat.workingSets += workoutWorkingSets(w)
    stat.volumeKg += workoutVolumeKg(w)
  }
  return buckets
}

export interface HistoryTotals {
  workouts: number
  workingSets: number
  volumeKg: number
  durationSec: number
  activeDays: number
  /** Distinct training days per week over the observed span. */
  perWeek: number
  firstWorkoutAt: number | null
  longestStreakDays: number
}

/** Lifetime totals for the Profile screen. */
export function historyTotals(workouts: Workout[]): HistoryTotals {
  if (workouts.length === 0) {
    return {
      workouts: 0,
      workingSets: 0,
      volumeKg: 0,
      durationSec: 0,
      activeDays: 0,
      perWeek: 0,
      firstWorkoutAt: null,
      longestStreakDays: 0,
    }
  }
  const days = new Set<string>()
  const dayTimestamps = new Set<number>()
  let workingSets = 0
  let volumeKg = 0
  let durationSec = 0
  let first = Infinity
  for (const w of workouts) {
    workingSets += workoutWorkingSets(w)
    volumeKg += workoutVolumeKg(w)
    durationSec += w.durationSec ?? 0
    first = Math.min(first, w.startedAt)
    const d = new Date(w.startedAt)
    d.setHours(0, 0, 0, 0)
    days.add(d.toDateString())
    dayTimestamps.add(d.getTime())
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const spanDays = Math.max(1, Math.round((today.getTime() - first) / 86400000) + 1)
  const spanWeeks = Math.max(1, spanDays / 7)

  // Longest run of consecutive training days.
  const sortedDays = [...dayTimestamps].sort((a, b) => a - b)
  let longest = 1
  let run = 1
  for (let i = 1; i < sortedDays.length; i++) {
    if (Math.round((sortedDays[i] - sortedDays[i - 1]) / 86400000) === 1) run += 1
    else run = 1
    longest = Math.max(longest, run)
  }

  return {
    workouts: workouts.length,
    workingSets,
    volumeKg,
    durationSec,
    activeDays: days.size,
    perWeek: Math.round((days.size / spanWeeks) * 10) / 10,
    firstWorkoutAt: first,
    longestStreakDays: longest,
  }
}

/** Exercises most recently used, for the top of the exercise picker. */
export function recentExerciseIds(workouts: Workout[], limit = 12): string[] {
  const seen: string[] = []
  const ordered = [...workouts].sort((a, b) => b.startedAt - a.startedAt)
  for (const w of ordered) {
    for (const we of w.exercises) {
      if (we.sets.length === 0) continue
      if (!seen.includes(we.exerciseId)) seen.push(we.exerciseId)
      if (seen.length >= limit) return seen
    }
  }
  return seen
}

/** Session-by-exercise matrix used for the Progress "recent sessions" table. */
export function exerciseChartSeries(
  workouts: Workout[],
  exerciseId: string,
  metric: 'weight' | 'volume' | 'oneRm',
): { date: number; value: number; label: string }[] {
  return exerciseSessions(workouts, exerciseId).map((s) => {
    if (metric === 'weight') {
      return { date: s.date, value: s.topSet?.weightKg ?? 0, label: s.workoutName }
    }
    if (metric === 'volume') {
      return { date: s.date, value: Math.round(s.volumeKg), label: s.workoutName }
    }
    return { date: s.date, value: Math.round((s.bestOneRm ?? 0) * 10) / 10, label: s.workoutName }
  })
}

/** Exercises the user can see stats for, ranked by how often they're trained. */
export function rankExercisesByFrequency(workouts: Workout[]): { exerciseId: string; sessions: number }[] {
  const counts = new Map<string, number>()
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (!we.sets.some(isCompleted)) continue
      counts.set(we.exerciseId, (counts.get(we.exerciseId) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([exerciseId, sessions]) => ({ exerciseId, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
}

/** Exercises performed at least once, for the Progress picker. */
export function performedExerciseIds(workouts: Workout[]): string[] {
  return rankExercisesByFrequency(workouts).map((r) => r.exerciseId)
}

export function exerciseName(exercises: Record<string, Exercise>, id: string): string {
  return exercises[id]?.name ?? 'Unknown exercise'
}
