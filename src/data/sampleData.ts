/**
 * Deterministic sample history.
 *
 * Used by Profile → "Load sample data" so Progress charts, PRs and the muscle
 * breakdown are demonstrable on first run without hand-logging 30 workouts.
 * The generator is seeded, so the same history appears every time.
 */

import type { Workout, WorkoutExercise, WorkoutSet } from '../types'
import { slugifyExerciseName } from './seedExercises'
import { roundKg } from '../lib/units'

/** mulberry32 — tiny deterministic PRNG so sample data never drifts. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface SampleExercise {
  name: string
  /** Starting working weight in kg, 8 weeks ago. */
  base: number
  /** kg added per week. */
  weekly: number
  /** Target reps for the first working set. */
  reps: number
  sets: number
}

/**
 * Snap a generated weight to a real plate increment, so the sample log shows
 * numbers a person could actually load (55 kg, not 53.75 kg).
 */
function roundToPlate(kg: number): number {
  return roundKg(Math.round(kg / 2.5) * 2.5)
}

interface SampleDay {
  name: string
  /** 0 = Monday. */
  weekday: number
  exercises: SampleExercise[]
}

const DAYS: SampleDay[] = [
  {
    name: 'Push',
    weekday: 0,
    exercises: [
      { name: 'Bench Press', base: 60, weekly: 2.5, reps: 8, sets: 3 },
      { name: 'Incline Dumbbell Press', base: 22.5, weekly: 2.5, reps: 10, sets: 3 },
      { name: 'Overhead Press', base: 37.5, weekly: 2.5, reps: 7, sets: 3 },
      { name: 'Lateral Raise', base: 10, weekly: 2.5, reps: 14, sets: 3 },
      { name: 'Triceps Pushdown', base: 25, weekly: 2.5, reps: 12, sets: 3 },
    ],
  },
  {
    name: 'Pull',
    weekday: 2,
    exercises: [
      { name: 'Barbell Row', base: 55, weekly: 2.5, reps: 8, sets: 3 },
      { name: 'Lat Pulldown', base: 52.5, weekly: 2.5, reps: 10, sets: 3 },
      { name: 'Face Pull', base: 20, weekly: 2.5, reps: 15, sets: 3 },
      { name: 'Barbell Curl', base: 27.5, weekly: 2.5, reps: 10, sets: 3 },
    ],
  },
  {
    name: 'Legs',
    weekday: 4,
    exercises: [
      { name: 'Squat', base: 72.5, weekly: 2.5, reps: 8, sets: 3 },
      { name: 'Romanian Deadlift', base: 65, weekly: 2.5, reps: 9, sets: 3 },
      { name: 'Leg Press', base: 110, weekly: 5, reps: 12, sets: 3 },
      { name: 'Leg Curl', base: 32.5, weekly: 2.5, reps: 12, sets: 3 },
      { name: 'Calf Raise', base: 55, weekly: 2.5, reps: 15, sets: 4 },
    ],
  },
  {
    name: 'Full Body',
    weekday: 5,
    exercises: [
      { name: 'Squat', base: 70, weekly: 2.5, reps: 6, sets: 3 },
      { name: 'Bench Press', base: 57.5, weekly: 2.5, reps: 6, sets: 3 },
      { name: 'Barbell Row', base: 52.5, weekly: 2.5, reps: 6, sets: 3 },
      { name: 'Overhead Press', base: 35, weekly: 2.5, reps: 8, sets: 3 },
      { name: 'Barbell Curl', base: 25, weekly: 2.5, reps: 12, sets: 2 },
      { name: 'Triceps Pushdown', base: 22.5, weekly: 2.5, reps: 12, sets: 2 },
    ],
  },
]

const WEEKS = 8

/** Monday 00:00 of the week `weeksAgo` weeks before this week. */
function weekStart(weeksAgo: number, now = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow - weeksAgo * 7)
  return d
}

export function buildSampleHistory(now = Date.now()): Workout[] {
  const random = rng(20240921)
  const workouts: Workout[] = []

  for (let week = 0; week < WEEKS; week++) {
    for (const day of DAYS) {
      // Ids are derived from position rather than random, so loading the
      // sample twice produces the same workouts instead of duplicates.
      const stamp = `${week}-${day.weekday}`
      const weeksAgo = WEEKS - 1 - week
      const start = weekStart(weeksAgo, new Date(now))
      start.setDate(start.getDate() + day.weekday)
      start.setHours(17 + Math.floor(random() * 3), Math.floor(random() * 50), 0, 0)
      if (start.getTime() > now) continue

      const exercises: WorkoutExercise[] = day.exercises.map((ex, exIndex) => {
        const weight = roundToPlate(ex.base + ex.weekly * week)
        const sets: WorkoutSet[] = []

        // A single warm-up on the first movement of the session, so the
        // warm-up rendering path is represented in the sample too.
        if (exIndex === 0) {
          sets.push({
            id: `set_sample_${stamp}_${exIndex}_w`,
            type: 'warmup',
            weightKg: roundToPlate(weight * 0.5),
            reps: 12,
            completed: true,
            timestamp: start.getTime(),
          })
        }

        for (let i = 0; i < ex.sets; i++) {
          // Last set typically drops a rep, like a real working session.
          const repDrop = i === ex.sets - 1 && random() > 0.35 ? 1 : 0
          const wobble = random() > 0.85 ? 1 : 0
          sets.push({
            id: `set_sample_${stamp}_${exIndex}_${i}`,
            type: i === ex.sets - 1 && random() > 0.85 ? 'failure' : 'normal',
            weightKg: weight,
            reps: Math.max(3, ex.reps - repDrop - wobble),
            completed: true,
            timestamp: start.getTime() + (exIndex * 8 + i * 3) * 60000,
          })
        }
        return { id: `we_sample_${stamp}_${exIndex}`, exerciseId: slugifyExerciseName(ex.name), sets }
      })

      const durationSec = Math.round(52 * 60 + random() * 20 * 60)
      workouts.push({
        id: `w_sample_${stamp}`,
        name: day.name,
        startedAt: start.getTime(),
        finishedAt: start.getTime() + durationSec * 1000,
        durationSec,
        exercises,
      })
    }
  }

  return workouts.sort((a, b) => b.startedAt - a.startedAt)
}
