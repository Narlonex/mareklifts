/**
 * Single zustand store, persisted to localStorage.
 *
 * Design notes:
 *  - `activeWorkout` is persisted on EVERY mutation and is deliberately not
 *    discarded on reload, so closing the app mid-session (or a phone dying)
 *    never loses logged sets.
 *  - `restTimer` stores a wall-clock `endsAt`, so the countdown stays correct
 *    even if the tab was backgrounded or the app was closed.
 *  - Statistics and PRs are NEVER stored here; they are derived from `history`
 *    by lib/stats.ts, which is why History and Progress cannot disagree.
 *  - All weights are canonical kilograms. `user.unit` only affects display.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Exercise,
  Muscle,
  Equipment,
  ExerciseCategory,
  PRKind,
  RestTimerState,
  Routine,
  SetType,
  User,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '../types'
import { SEED_EXERCISES, slugifyExerciseName } from '../data/seedExercises'
import { DEFAULT_REST_SECONDS, epley1RM, prForExercise, setBreaksRecords, detectPrs, exerciseVolumeKg, workoutVolumeKg, workoutWorkingSets, weightKey } from '../lib/stats'
import { uid } from '../lib/id'
import { roundKg } from '../lib/units'
import { buildSampleHistory } from '../data/sampleData'

interface AppState {
  user: User
  customExercises: Exercise[]
  routines: Routine[]
  activeWorkout: Workout | null
  /** Foreground seconds already banked for the active workout clock. */
  clockAccumulatedSec: number
  history: Workout[]
  restTimer: RestTimerState | null

  // ---------------------------------------------------------------- user
  updateUser: (patch: Partial<User>) => void

  // ----------------------------------------------------------- exercises
  addCustomExercise: (input: {
    name: string
    primaryMuscle: Muscle
    secondaryMuscles?: Muscle[]
    equipment: Equipment
    category: ExerciseCategory
    instructions?: string
  }) => string
  deleteCustomExercise: (id: string) => void

  // ------------------------------------------------------------ routines
  createRoutine: (name: string, entries?: { exerciseId: string; targetSets?: number }[]) => string
  replaceRoutineExercises: (
    id: string,
    entries: { exerciseId: string; targetSets?: number }[],
  ) => void
  renameRoutine: (id: string, name: string) => void
  setRoutineNotes: (id: string, notes: string) => void
  deleteRoutine: (id: string) => void
  duplicateRoutine: (id: string) => string | null
  addRoutineExercise: (routineId: string, exerciseId: string, targetSets?: number) => void
  removeRoutineExercise: (routineId: string, routineExerciseId: string) => void
  moveRoutineExercise: (routineId: string, routineExerciseId: string, direction: -1 | 1) => void
  setRoutineExerciseTargetSets: (routineId: string, routineExerciseId: string, targetSets: number) => void

  // ----------------------------------------------------------- workout
  startEmptyWorkout: (name?: string) => string
  startFromRoutine: (routineId: string) => string | null
  repeatWorkout: (workoutId: string) => string | null
  renameActiveWorkout: (name: string) => void
  setWorkoutNotes: (notes: string) => void
  cancelActiveWorkout: () => void
  addClockSeconds: (seconds: number) => void

  addExerciseToWorkout: (exerciseId: string, opts?: { targetSets?: number }) => void
  removeExerciseFromWorkout: (workoutExerciseId: string) => void
  moveWorkoutExercise: (workoutExerciseId: string, direction: -1 | 1) => void
  setExerciseNotes: (workoutExerciseId: string, notes: string) => void
  replaceExercise: (workoutExerciseId: string, exerciseId: string) => void

  addSet: (workoutExerciseId: string) => void
  updateSet: (workoutExerciseId: string, setId: string, patch: { weightKg?: number; reps?: number }) => void
  deleteSet: (workoutExerciseId: string, setId: string) => void
  setSetType: (workoutExerciseId: string, setId: string, type: SetType) => void
  /** Returns the PR kinds this completion just broke, for the live toast. */
  toggleSetComplete: (workoutExerciseId: string, setId: string) => { completed: boolean; prKinds: PRKind[] }
  /** Completes a set and immediately queues the next one — the 1-tap loop. */
  completeAndAdvance: (workoutExerciseId: string, setId: string) => { prKinds: PRKind[] }

  finishWorkout: () => string | null
  deleteHistoryEntry: (workoutId: string) => void

  // ---------------------------------------------------------- rest timer
  startRest: (seconds?: number) => void
  pauseRest: () => void
  resumeRest: () => void
  addRestTime: (deltaSeconds: number) => void
  skipRest: () => void

  // --------------------------------------------------------------- data
  exportData: () => string
  importData: (json: string) => { ok: boolean; error?: string }
  loadSampleData: () => void
  clearHistory: () => void
  resetAll: () => void
}

// ------------------------------------------------------------------ helpers

function defaultWorkoutName(now = new Date()): string {
  const h = now.getHours()
  if (h < 12) return 'Morning Workout'
  if (h < 17) return 'Afternoon Workout'
  return 'Evening Workout'
}

function makeSet(partial: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: uid('set'),
    type: 'normal',
    weightKg: 0,
    reps: 0,
    completed: false,
    ...partial,
  }
}

function makeUser(): User {
  return {
    id: uid('user'),
    name: '',
    bodyWeightKg: null,
    heightCm: null,
    unit: 'kg',
    theme: 'system',
    defaultRestSeconds: DEFAULT_REST_SECONDS,
    autoStartRest: true,
    createdAt: Date.now(),
  }
}

function seedRoutine(name: string, entries: [string, number][]): Routine {
  const now = Date.now()
  return {
    id: uid('routine'),
    name,
    createdAt: now,
    updatedAt: now,
    exercises: entries.map(([exerciseName, targetSets]) => ({
      id: uid('re'),
      exerciseId: slugifyExerciseName(exerciseName),
      targetSets,
    })),
  }
}

function seedRoutines(): Routine[] {
  return [
    seedRoutine('Push', [
      ['Bench Press', 3],
      ['Incline Dumbbell Press', 3],
      ['Overhead Press', 3],
      ['Lateral Raise', 3],
      ['Triceps Pushdown', 3],
    ]),
    seedRoutine('Pull', [
      ['Pull Up', 3],
      ['Barbell Row', 3],
      ['Lat Pulldown', 3],
      ['Face Pull', 3],
      ['Barbell Curl', 3],
    ]),
    seedRoutine('Legs', [
      ['Squat', 3],
      ['Romanian Deadlift', 3],
      ['Leg Press', 3],
      ['Leg Curl', 3],
      ['Calf Raise', 4],
    ]),
    seedRoutine('Full Body', [
      ['Squat', 3],
      ['Bench Press', 3],
      ['Barbell Row', 3],
      ['Overhead Press', 3],
      ['Barbell Curl', 2],
      ['Triceps Pushdown', 2],
    ]),
  ]
}

function initialData(): Pick<
  AppState,
  'user' | 'customExercises' | 'routines' | 'activeWorkout' | 'clockAccumulatedSec' | 'history' | 'restTimer'
> {
  return {
    user: makeUser(),
    customExercises: [],
    routines: seedRoutines(),
    activeWorkout: null,
    clockAccumulatedSec: 0,
    history: [],
    restTimer: null,
  }
}

/** All exercises the app knows about: seed DB + user-created. */
export function allExercises(state: Pick<AppState, 'customExercises'>): Exercise[] {
  return [...state.customExercises, ...SEED_EXERCISES]
}

const DEFAULT_SETS = 3
const MAX_PREFILL_SETS = 6

/**
 * Build a pre-filled set list for an exercise so the user only has to tap ✓.
 *
 * The previous session drives both the "Previous" column and the pre-filled
 * weight/reps at the same index, which is exactly how the fast-path works:
 * open a routine, tap ✓ three times, done.
 */
function buildPrefilledSets(
  history: Workout[],
  exerciseId: string,
  opts: { targetSets?: number } = {},
): WorkoutSet[] {
  let previousSets: { weightKg: number; reps: number }[] = []
  const sessions = history
    .filter((w) => w.exercises.some((we) => we.exerciseId === exerciseId && we.sets.some((s) => s.completed)))
    .sort((a, b) => b.startedAt - a.startedAt)
  const last = sessions[0]
  if (last) {
    const we = last.exercises.find((e) => e.exerciseId === exerciseId)!
    previousSets = we.sets.filter((s) => s.type !== 'warmup').map((s) => ({ weightKg: s.weightKg, reps: s.reps }))
  }
  const count = Math.min(
    Math.max(opts.targetSets ?? previousSets.length ?? DEFAULT_SETS, 1),
    MAX_PREFILL_SETS,
  )
  const total = opts.targetSets ?? Math.max(count, previousSets.length > 0 ? previousSets.length : DEFAULT_SETS)
  const sets: WorkoutSet[] = []
  for (let i = 0; i < Math.min(total, MAX_PREFILL_SETS); i++) {
    const prev = previousSets[i] ?? previousSets[previousSets.length - 1]
    sets.push(
      makeSet({
        weightKg: prev ? roundKg(prev.weightKg) : 0,
        reps: prev ? prev.reps : 0,
      }),
    )
  }
  return sets
}

function withActive(
  state: AppState,
  mutate: (workout: Workout) => Workout,
): { activeWorkout: Workout } | Record<string, never> {
  if (!state.activeWorkout) return {}
  return { activeWorkout: mutate(state.activeWorkout) }
}

function mapExercise(
  workout: Workout,
  workoutExerciseId: string,
  fn: (we: WorkoutExercise) => WorkoutExercise,
): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((we) => (we.id === workoutExerciseId ? fn(we) : we)),
  }
}

function migrateWorkout(
  workout: Workout | null,
  history: Workout[],
): Workout | null {
  if (!workout) return null
  return {
    ...workout,
    exercises: workout.exercises.map((we) => ({
      ...we,
      // Backfill any exercise that somehow ended up with zero rows so the
      // screen is never a dead end.
      sets: we.sets.length > 0 ? we.sets : buildPrefilledSets(history, we.exerciseId),
    })),
  }
}

// -------------------------------------------------------------------- store

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      // ------------------------------------------------------------- user
      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      // -------------------------------------------------------- exercises
      addCustomExercise: (input) => {
        const id = `ex_${slugifyExerciseName(input.name).replace(/^ex_/, '')}_${uid().slice(0, 4)}`
        const exercise: Exercise = {
          id,
          name: input.name.trim(),
          primaryMuscle: input.primaryMuscle,
          muscleGroup: MUSCLE_GROUP_FOR(input.primaryMuscle),
          secondaryMuscles: input.secondaryMuscles ?? [],
          equipment: input.equipment,
          category: input.category,
          instructions: input.instructions?.trim() || 'Custom exercise.',
          isCustom: true,
        }
        set((s) => ({ customExercises: [exercise, ...s.customExercises] }))
        return id
      },
      deleteCustomExercise: (id) =>
        set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) })),

      // --------------------------------------------------------- routines
      createRoutine: (name, entries) => {
        const now = Date.now()
        const routine: Routine = {
          id: uid('routine'),
          name: name.trim() || 'New Routine',
          createdAt: now,
          updatedAt: now,
          exercises: (entries ?? []).map((entry) => ({
            id: uid('re'),
            exerciseId: entry.exerciseId,
            targetSets: entry.targetSets ?? DEFAULT_SETS,
          })),
        }
        set((s) => ({ routines: [...s.routines, routine] }))
        return routine.id
      },

      replaceRoutineExercises: (id, entries) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === id
              ? {
                  ...r,
                  updatedAt: Date.now(),
                  exercises: entries.map((entry) => ({
                    id: uid('re'),
                    exerciseId: entry.exerciseId,
                    targetSets: entry.targetSets ?? DEFAULT_SETS,
                  })),
                }
              : r,
          ),
        })),

      renameRoutine: (id, name) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === id ? { ...r, name: name.trim() || r.name, updatedAt: Date.now() } : r,
          ),
        })),

      setRoutineNotes: (id, notes) =>
        set((s) => ({
          routines: s.routines.map((r) => (r.id === id ? { ...r, notes, updatedAt: Date.now() } : r)),
        })),

      deleteRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      duplicateRoutine: (id) => {
        const source = get().routines.find((r) => r.id === id)
        if (!source) return null
        const now = Date.now()
        const copy: Routine = {
          ...source,
          id: uid('routine'),
          name: `${source.name} copy`,
          createdAt: now,
          updatedAt: now,
          exercises: source.exercises.map((re) => ({ ...re, id: uid('re') })),
        }
        set((s) => ({ routines: [...s.routines, copy] }))
        return copy.id
      },

      addRoutineExercise: (routineId, exerciseId, targetSets = DEFAULT_SETS) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  updatedAt: Date.now(),
                  exercises: [...r.exercises, { id: uid('re'), exerciseId, targetSets }],
                }
              : r,
          ),
        })),

      removeRoutineExercise: (routineId, routineExerciseId) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  updatedAt: Date.now(),
                  exercises: r.exercises.filter((re) => re.id !== routineExerciseId),
                }
              : r,
          ),
        })),

      moveRoutineExercise: (routineId, routineExerciseId, direction) =>
        set((s) => ({
          routines: s.routines.map((r) => {
            if (r.id !== routineId) return r
            const index = r.exercises.findIndex((re) => re.id === routineExerciseId)
            const target = index + direction
            if (index < 0 || target < 0 || target >= r.exercises.length) return r
            const exercises = [...r.exercises]
            ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
            return { ...r, exercises, updatedAt: Date.now() }
          }),
        })),

      setRoutineExerciseTargetSets: (routineId, routineExerciseId, targetSets) =>
        set((s) => ({
          routines: s.routines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  updatedAt: Date.now(),
                  exercises: r.exercises.map((re) =>
                    re.id === routineExerciseId
                      ? { ...re, targetSets: Math.min(Math.max(targetSets, 1), 10) }
                      : re,
                  ),
                }
              : r,
          ),
        })),

      // ---------------------------------------------------------- workout
      startEmptyWorkout: (name) => {
        const workout: Workout = {
          id: uid('w'),
          name: name?.trim() || defaultWorkoutName(),
          startedAt: Date.now(),
          exercises: [],
        }
        set({ activeWorkout: workout, clockAccumulatedSec: 0, restTimer: null })
        return workout.id
      },

      startFromRoutine: (routineId) => {
        const state = get()
        const routine = state.routines.find((r) => r.id === routineId)
        if (!routine) return null
        const workout: Workout = {
          id: uid('w'),
          name: routine.name,
          startedAt: Date.now(),
          exercises: routine.exercises.map((re) => ({
            id: uid('we'),
            exerciseId: re.exerciseId,
            sets: buildPrefilledSets(state.history, re.exerciseId, { targetSets: re.targetSets }),
          })),
        }
        set({ activeWorkout: workout, clockAccumulatedSec: 0, restTimer: null })
        return workout.id
      },

      repeatWorkout: (workoutId) => {
        const state = get()
        const source = state.history.find((w) => w.id === workoutId)
        if (!source) return null
        const workout: Workout = {
          id: uid('w'),
          name: source.name,
          startedAt: Date.now(),
          exercises: source.exercises.map((we) => ({
            id: uid('we'),
            exerciseId: we.exerciseId,
            notes: we.notes,
            sets: we.sets
              .filter((s) => s.type !== 'warmup')
              .map((s) =>
                makeSet({
                  type: s.type === 'warmup' ? 'normal' : s.type,
                  weightKg: s.weightKg,
                  reps: s.reps,
                }),
              ),
          })),
        }
        if (workout.exercises.every((we) => we.sets.length === 0)) {
          workout.exercises = source.exercises.map((we) => ({
            id: uid('we'),
            exerciseId: we.exerciseId,
            sets: buildPrefilledSets(state.history, we.exerciseId),
          }))
        }
        set({ activeWorkout: workout, clockAccumulatedSec: 0, restTimer: null })
        return workout.id
      },

      renameActiveWorkout: (name) =>
        set((s) => (s.activeWorkout ? { activeWorkout: { ...s.activeWorkout, name } } : {})),

      setWorkoutNotes: (notes) =>
        set((s) => (s.activeWorkout ? { activeWorkout: { ...s.activeWorkout, notes } } : {})),

      cancelActiveWorkout: () => set({ activeWorkout: null, clockAccumulatedSec: 0, restTimer: null }),

      addClockSeconds: (seconds) =>
        set((s) =>
          s.activeWorkout ? { clockAccumulatedSec: Math.max(0, s.clockAccumulatedSec + seconds) } : {},
        ),

      addExerciseToWorkout: (exerciseId, opts) =>
        set((s) =>
          withActive(s, (workout) => ({
            ...workout,
            exercises: [
              ...workout.exercises,
              {
                id: uid('we'),
                exerciseId,
                sets: buildPrefilledSets(s.history, exerciseId, opts),
              },
            ],
          })),
        ),

      removeExerciseFromWorkout: (workoutExerciseId) =>
        set((s) =>
          withActive(s, (workout) => ({
            ...workout,
            exercises: workout.exercises.filter((we) => we.id !== workoutExerciseId),
          })),
        ),

      moveWorkoutExercise: (workoutExerciseId, direction) =>
        set((s) =>
          withActive(s, (workout) => {
            const index = workout.exercises.findIndex((we) => we.id === workoutExerciseId)
            const target = index + direction
            if (index < 0 || target < 0 || target >= workout.exercises.length) return workout
            const exercises = [...workout.exercises]
            ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
            return { ...workout, exercises }
          }),
        ),

      setExerciseNotes: (workoutExerciseId, notes) =>
        set((s) => withActive(s, (w) => mapExercise(w, workoutExerciseId, (we) => ({ ...we, notes })))),

      replaceExercise: (workoutExerciseId, exerciseId) =>
        set((s) =>
          withActive(s, (w) =>
            mapExercise(w, workoutExerciseId, (we) => ({
              ...we,
              exerciseId,
              sets: buildPrefilledSets(s.history, exerciseId, { targetSets: we.sets.length }),
            })),
          ),
        ),

      addSet: (workoutExerciseId) =>
        set((s) =>
          withActive(s, (w) =>
            mapExercise(w, workoutExerciseId, (we) => {
              const last = we.sets[we.sets.length - 1]
              return {
                ...we,
                sets: [
                  ...we.sets,
                  makeSet({
                    // Carry the last entry forward: the next set is almost
                    // always the same weight, ready to tap ✓ immediately.
                    weightKg: last ? last.weightKg : 0,
                    reps: last ? last.reps : 0,
                    type: last && last.type === 'warmup' ? 'normal' : (last?.type ?? 'normal'),
                  }),
                ],
              }
            }),
          ),
        ),

      updateSet: (workoutExerciseId, setId, patch) =>
        set((s) =>
          withActive(s, (w) =>
            mapExercise(w, workoutExerciseId, (we) => ({
              ...we,
              sets: we.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)),
            })),
          ),
        ),

      deleteSet: (workoutExerciseId, setId) =>
        set((s) =>
          withActive(s, (w) =>
            mapExercise(w, workoutExerciseId, (we) => ({
              ...we,
              sets: we.sets.filter((x) => x.id !== setId),
            })),
          ),
        ),

      setSetType: (workoutExerciseId, setId, type) =>
        set((s) =>
          withActive(s, (w) =>
            mapExercise(w, workoutExerciseId, (we) => ({
              ...we,
              sets: we.sets.map((x) => (x.id === setId ? { ...x, type } : x)),
            })),
          ),
        ),

      toggleSetComplete: (workoutExerciseId, setId) => {
        const state = get()
        const workout = state.activeWorkout
        if (!workout) return { completed: false, prKinds: [] }
        const we = workout.exercises.find((e) => e.id === workoutExerciseId)
        const target = we?.sets.find((x) => x.id === setId)
        if (!target) return { completed: false, prKinds: [] }

        const nowCompleted = !target.completed
        // Baseline excludes the in-progress workout by construction (`history`
        // only holds finished workouts).
        const baseline = prForExercise(state.history, we!.exerciseId)
        const completedSet: WorkoutSet = { ...target, completed: nowCompleted, timestamp: Date.now() }
        const prKinds = nowCompleted ? setBreaksRecords(completedSet, baseline) : []

        set((s) => ({
          ...withActive(s, (w) =>
            mapExercise(w, workoutExerciseId, (x) => ({
              ...x,
              sets: x.sets.map((y) => (y.id === setId ? completedSet : y)),
            })),
          ),
        }))

        if (nowCompleted && get().user.autoStartRest) {
          get().startRest()
        }
        return { completed: nowCompleted, prKinds }
      },

      completeAndAdvance: (workoutExerciseId, setId) => {
        const result = get().toggleSetComplete(workoutExerciseId, setId)
        if (!result.completed) return { prKinds: [] }
        const workout = get().activeWorkout
        const we = workout?.exercises.find((e) => e.id === workoutExerciseId)
        if (we && we.sets.every((s) => s.completed)) {
          // Everything logged so far is done — queue the next set so the user
          // can keep tapping in the same place.
          get().addSet(workoutExerciseId)
        }
        return { prKinds: result.prKinds }
      },

      finishWorkout: () => {
        const state = get()
        const active = state.activeWorkout
        if (!active) return null
        const exercises = active.exercises
          .map((we) => ({ ...we, sets: we.sets.filter((s) => s.completed) }))
          .filter((we) => we.sets.length > 0)
        if (exercises.length === 0) return null

        const finishedAt = Date.now()
        const durationSec = Math.max(
          1,
          Math.round(state.clockAccumulatedSec || (finishedAt - active.startedAt) / 1000),
        )
        const draft: Workout = {
          ...active,
          exercises,
          finishedAt,
          durationSec,
        }
        const saved: Workout = {
          ...draft,
          totalVolumeKg: workoutVolumeKg(draft),
          totalWorkingSets: workoutWorkingSets(draft),
          prsAchieved: detectPrs(draft, state.history),
        }
        set((s) => ({
          history: [saved, ...s.history],
          activeWorkout: null,
          clockAccumulatedSec: 0,
          restTimer: null,
        }))
        return saved.id
      },

      deleteHistoryEntry: (workoutId) =>
        set((s) => ({ history: s.history.filter((w) => w.id !== workoutId) })),

      // ------------------------------------------------------ rest timer
      startRest: (seconds) => {
        const duration = seconds ?? get().user.defaultRestSeconds
        set({
          restTimer: {
            endsAt: Date.now() + duration * 1000,
            totalSeconds: duration,
            pausedRemainingMs: null,
          },
        })
      },

      pauseRest: () =>
        set((s) => {
          if (!s.restTimer || s.restTimer.pausedRemainingMs !== null) return {}
          return {
            restTimer: {
              ...s.restTimer,
              pausedRemainingMs: Math.max(0, s.restTimer.endsAt - Date.now()),
            },
          }
        }),

      resumeRest: () =>
        set((s) => {
          if (!s.restTimer || s.restTimer.pausedRemainingMs === null) return {}
          const remaining = s.restTimer.pausedRemainingMs
          return {
            restTimer: {
              ...s.restTimer,
              endsAt: Date.now() + remaining,
              pausedRemainingMs: null,
            },
          }
        }),

      addRestTime: (deltaSeconds) =>
        set((s) => {
          if (!s.restTimer) return {}
          const delta = deltaSeconds * 1000
          if (s.restTimer.pausedRemainingMs !== null) {
            return {
              restTimer: {
                ...s.restTimer,
                pausedRemainingMs: Math.max(0, s.restTimer.pausedRemainingMs + delta),
                totalSeconds: Math.max(1, s.restTimer.totalSeconds + deltaSeconds),
              },
            }
          }
          return {
            restTimer: {
              ...s.restTimer,
              endsAt: s.restTimer.endsAt + delta,
              totalSeconds: Math.max(1, s.restTimer.totalSeconds + deltaSeconds),
            },
          }
        }),

      skipRest: () => set({ restTimer: null }),

      // ------------------------------------------------------------ data
      exportData: () => {
        const s = get()
        return JSON.stringify(
          {
            app: 'MarekLifts',
            version: 1,
            exportedAt: new Date().toISOString(),
            user: s.user,
            customExercises: s.customExercises,
            routines: s.routines,
            history: s.history,
            activeWorkout: s.activeWorkout,
          },
          null,
          2,
        )
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Not a valid backup file.' }
          if (!Array.isArray(parsed.history) && !Array.isArray(parsed.routines)) {
            return { ok: false, error: 'Missing workout history — is this a MarekLifts backup?' }
          }
          set((s) => ({
            user: { ...s.user, ...(parsed.user ?? {}) },
            customExercises: Array.isArray(parsed.customExercises) ? parsed.customExercises : s.customExercises,
            routines: Array.isArray(parsed.routines) ? parsed.routines : s.routines,
            history: Array.isArray(parsed.history) ? parsed.history : s.history,
            activeWorkout: parsed.activeWorkout ?? null,
          }))
          return { ok: true }
        } catch {
          return { ok: false, error: 'Could not read that file.' }
        }
      },

      loadSampleData: () => {
        const sample = buildSampleHistory()
        const existing = get().history
        const existingIds = new Set(existing.map((w) => w.id))
        const merged = [...existing, ...sample.filter((w) => !existingIds.has(w.id))]
        set({ history: merged.sort((a, b) => b.startedAt - a.startedAt) })
      },

      clearHistory: () => set({ history: [], activeWorkout: null, clockAccumulatedSec: 0, restTimer: null }),

      resetAll: () => set({ ...initialData() }),
    }),
    {
      name: 'mareklifts:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        customExercises: state.customExercises,
        routines: state.routines,
        activeWorkout: state.activeWorkout,
        clockAccumulatedSec: state.clockAccumulatedSec,
        history: state.history,
        restTimer: state.restTimer,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          user: { ...current.user, ...(p.user ?? {}) },
          // A workout left open in a previous session is restored, with any
          // exercise that has no rows back-filled so the screen still works.
          activeWorkout: migrateWorkout(p.activeWorkout ?? null, p.history ?? []),
          history: p.history ?? [],
          routines: p.routines ?? current.routines,
          customExercises: p.customExercises ?? [],
          clockAccumulatedSec: p.clockAccumulatedSec ?? 0,
          restTimer: p.restTimer ?? null,
        }
      },
    },
  ),
)

// Imported lazily to avoid a circular import with the seed data module.
function MUSCLE_GROUP_FOR(muscle: Muscle) {
  // Kept in sync with data/seedExercises.MUSCLE_TO_GROUP.
  switch (muscle) {
    case 'Chest':
    case 'Upper Chest':
      return 'Chest'
    case 'Lats':
    case 'Upper Back':
    case 'Lower Back':
    case 'Traps':
      return 'Back'
    case 'Front Delts':
    case 'Side Delts':
    case 'Rear Delts':
      return 'Shoulders'
    case 'Biceps':
    case 'Triceps':
    case 'Forearms':
      return 'Arms'
    case 'Quads':
    case 'Hamstrings':
    case 'Glutes':
    case 'Calves':
      return 'Legs'
    default:
      return 'Core'
  }
}

/** Convenience for unit tests and the sample-data generator. */
export const __test = {
  buildPrefilledSets,
  defaultWorkoutName,
  seedRoutines,
  weightKey,
  epley1RM,
  exerciseVolumeKg,
}
