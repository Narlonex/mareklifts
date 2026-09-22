/**
 * Domain model for MarekLifts.
 *
 * Mirrors the MVP spec entities (User, Exercise, Routine, Workout,
 * WorkoutExercise, Set) plus the few extra fields the features need.
 *
 * Storage note: every weight is persisted in KILOGRAMS as a canonical number.
 * The kg/lb preference only affects display and input (see lib/units.ts), so
 * switching units never rewrites or corrupts history.
 */

/** Coarse groups used for the muscle-group statistics breakdown. */
export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'

/** Fine-grained muscles recorded on each exercise. */
export type Muscle =
  | 'Chest'
  | 'Upper Chest'
  | 'Lats'
  | 'Upper Back'
  | 'Lower Back'
  | 'Traps'
  | 'Front Delts'
  | 'Side Delts'
  | 'Rear Delts'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Abs'
  | 'Obliques'

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'EZ Bar'
  | 'Kettlebell'
  | 'Band'
  | 'Other'

export type ExerciseCategory = 'Compound' | 'Isolation'

export interface Exercise {
  id: string
  name: string
  /** Coarse group, drives the Progress muscle breakdown. */
  muscleGroup: MuscleGroup
  equipment: Equipment
  category: ExerciseCategory
  primaryMuscle: Muscle
  secondaryMuscles: Muscle[]
  /** Original short coaching cue — no third-party content. */
  instructions: string
  /** True for exercises the user created themselves. */
  isCustom?: boolean
}

export interface RoutineExercise {
  /** Instance id, so the same exercise can appear twice in one routine. */
  id: string
  exerciseId: string
  /** Optional planned working sets. */
  targetSets?: number
}

export interface Routine {
  id: string
  name: string
  exercises: RoutineExercise[]
  notes?: string
  createdAt: number
  updatedAt: number
}

export type SetType = 'warmup' | 'normal' | 'failure'

export interface WorkoutSet {
  id: string
  type: SetType
  /** Canonical kilograms. */
  weightKg: number
  reps: number
  completed: boolean
  /** Epoch ms when the set was marked complete. */
  timestamp?: number
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  sets: WorkoutSet[]
  notes?: string
}

export interface Workout {
  id: string
  name: string
  /** Epoch ms. */
  startedAt: number
  /** Epoch ms; undefined while the workout is still in progress. */
  finishedAt?: number
  /** Wall-clock training time, excluding foreground pauses. */
  durationSec?: number
  exercises: WorkoutExercise[]
  notes?: string
  /** Derived on finish, cached for fast history rendering. */
  totalVolumeKg?: number
  /** Completed working sets only (warm-ups excluded). */
  totalWorkingSets?: number
  prsAchieved?: PRHit[]
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type Unit = 'kg' | 'lb'

export interface User {
  id: string
  name: string
  /** Canonical kilograms. */
  bodyWeightKg: number | null
  /** Canonical centimetres. */
  heightCm: number | null
  unit: Unit
  theme: ThemePreference
  /** Rest timer default, in seconds. */
  defaultRestSeconds: number
  /** Auto-start the rest countdown when a set is completed. */
  autoStartRest: boolean
  createdAt: number
}

/** A resolved "one rep max" style personal best for a single exercise. */
export interface PRRecord {
  exerciseId: string
  /** Heaviest completed working set ever. */
  heaviest: { weightKg: number; reps: number; date: number } | null
  /** Best estimated 1RM (Epley). */
  bestOneRm: { value: number; weightKg: number; reps: number; date: number } | null
  /** Best single-session volume for this exercise. */
  bestVolume: { volumeKg: number; date: number } | null
  /** Max reps achieved at each logged weight, keyed by rounded kg. */
  repsAtWeight: Record<string, { reps: number; date: number }>
}

export type PRKind = 'weight' | 'reps' | 'oneRm' | 'volume'

export interface PRHit {
  exerciseId: string
  kind: PRKind
  weightKg: number
  reps: number
  /** The new record's measured value (kg for weight/oneRm, reps, or volume kg). */
  value: number
  /** The previous best, for "beat 57.5 kg" style copy. Null on a first-ever record. */
  previousValue: number | null
}

export interface RestTimerState {
  /** Wall-clock epoch ms when the countdown ends — survives app restarts. */
  endsAt: number
  totalSeconds: number
  /** Remaining ms while paused; null when the timer is running. */
  pausedRemainingMs: number | null
}
