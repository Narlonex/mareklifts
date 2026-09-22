import { beforeEach, describe, expect, it } from 'vitest'
import type { Workout, WorkoutSet } from '../types'
import { useAppStore } from './useAppStore'
import { slugifyExerciseName } from '../data/seedExercises'
import { workoutVolumeKg, workoutWorkingSets } from '../lib/stats'

const BENCH = slugifyExerciseName('Bench Press')
const SQUAT = slugifyExerciseName('Squat')
const STORAGE_KEY = 'mareklifts:v1'

let counter = 0
const id = (prefix: string) => `${prefix}-${++counter}`

function makeSet(weightKg: number, reps: number, type: WorkoutSet['type'] = 'normal'): WorkoutSet {
  return { id: id('set'), type, weightKg, reps, completed: true, timestamp: Date.now() }
}

/** A finished Bench Press session at 55 kg x 8/8/7. */
function seedBenchHistory(startedAt = Date.now() - 7 * 86400000): Workout {
  return {
    id: id('w'),
    name: 'Push',
    startedAt,
    finishedAt: startedAt + 3300000,
    durationSec: 3300,
    exercises: [
      {
        id: id('we'),
        exerciseId: BENCH,
        sets: [makeSet(55, 8), makeSet(55, 8), makeSet(55, 7)],
      },
    ],
  }
}

const state = () => useAppStore.getState()

beforeEach(() => {
  localStorage.clear()
  state().resetAll()
})

describe('starting workouts', () => {
  it('creates an empty workout with a sensible default name', () => {
    const workoutId = state().startEmptyWorkout('Test Session')
    const active = state().activeWorkout
    expect(active?.id).toBe(workoutId)
    expect(active?.name).toBe('Test Session')
    expect(active?.exercises).toEqual([])
    expect(state().clockAccumulatedSec).toBe(0)
    expect(state().restTimer).toBeNull()
  })

  it('names an empty workout by time of day when none is given', () => {
    state().startEmptyWorkout()
    expect(state().activeWorkout?.name).toMatch(/Morning|Afternoon|Evening/)
  })

  it('prefills every set from the previous session so one tap logs a set', () => {
    useAppStore.setState({ history: [seedBenchHistory()] })
    const push = state().routines.find((r) => r.name === 'Push')!
    state().startFromRoutine(push.id)

    const bench = state().activeWorkout!.exercises.find((we) => we.exerciseId === BENCH)!
    expect(bench.sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [55, 8],
      [55, 8],
      [55, 7],
    ])
    // Nothing is marked done until the user taps the check mark.
    expect(bench.sets.every((s) => !s.completed)).toBe(true)
    // Other routine exercises have no history so they start blank but present.
    expect(state().activeWorkout!.exercises).toHaveLength(push.exercises.length)
  })

  it('honours the routine target set count for a brand-new exercise', () => {
    const legRoutine = state().routines.find((r) => r.name === 'Legs')!
    state().startFromRoutine(legRoutine.id)
    const calf = state().activeWorkout!.exercises.find((we) => we.exerciseId === slugifyExerciseName('Calf Raise'))!
    expect(calf.sets).toHaveLength(4)
  })

  it('starts a blank workout for an unknown routine', () => {
    expect(state().startFromRoutine('nope')).toBeNull()
    expect(state().activeWorkout).toBeNull()
  })

  it('repeats a past workout with its logged weights', () => {
    useAppStore.setState({ history: [seedBenchHistory()] })
    const workoutId = state().repeatWorkout(state().history[0].id)
    expect(workoutId).not.toBeNull()
    const bench = state().activeWorkout!.exercises[0]
    expect(bench.sets.map((s) => s.reps)).toEqual([8, 8, 7])
    expect(bench.sets.every((s) => !s.completed)).toBe(true)
  })
})

describe('logging sets', () => {
  beforeEach(() => {
    useAppStore.setState({ history: [seedBenchHistory()] })
    const push = state().routines.find((r) => r.name === 'Push')!
    state().startFromRoutine(push.id)
  })

  const benchId = () => state().activeWorkout!.exercises.find((we) => we.exerciseId === BENCH)!.id

  it('completes a prefilled set and reports no PR for a repeat performance', () => {
    const we = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!
    const result = state().toggleSetComplete(we.id, we.sets[0].id)
    expect(result.completed).toBe(true)
    expect(result.prKinds).toEqual([])
    expect(workoutWorkingSets(state().activeWorkout!)).toBe(1)
  })

  it('reports a PR when the weight goes up, and toggling back removes it', () => {
    const we = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!
    const setId = we.sets[0].id
    state().updateSet(we.id, setId, { weightKg: 60, reps: 6 })
    const result = state().toggleSetComplete(we.id, setId)
    expect(result.prKinds.sort()).toEqual(['oneRm', 'weight'])

    const undone = state().toggleSetComplete(we.id, setId)
    expect(undone.completed).toBe(false)
    expect(undone.prKinds).toEqual([])
  })

  it('starts the rest timer on completion when auto-start is on', () => {
    const we = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!
    state().toggleSetComplete(we.id, we.sets[0].id)
    expect(state().restTimer).not.toBeNull()
    expect(state().restTimer!.totalSeconds).toBe(120)
    expect(state().restTimer!.endsAt).toBeGreaterThan(Date.now())
  })

  it('does not start a timer when auto-start is off', () => {
    state().updateUser({ autoStartRest: false })
    const we = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!
    state().toggleSetComplete(we.id, we.sets[0].id)
    expect(state().restTimer).toBeNull()
  })

  it('adds a set carrying the last values forward', () => {
    const before = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!.sets
    state().addSet(benchId())
    const after = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!.sets
    expect(after).toHaveLength(before.length + 1)
    const last = after[after.length - 1]
    expect([last.weightKg, last.reps]).toEqual([before[before.length - 1].weightKg, before[before.length - 1].reps])
    expect(last.completed).toBe(false)
  })

  it('updates and deletes individual sets', () => {
    const we = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!
    const setId = we.sets[0].id
    state().updateSet(we.id, setId, { reps: 12 })
    expect(state().activeWorkout!.exercises.find((x) => x.id === we.id)!.sets[0].reps).toBe(12)

    state().deleteSet(we.id, setId)
    const remaining = state().activeWorkout!.exercises.find((x) => x.id === we.id)!.sets
    expect(remaining).toHaveLength(2)
    expect(remaining.some((s) => s.id === setId)).toBe(false)
  })

  it('excludes warm-up sets from volume but keeps them in the log', () => {
    const we = state().activeWorkout!.exercises.find((x) => x.exerciseId === BENCH)!
    state().updateSet(we.id, we.sets[0].id, { weightKg: 20, reps: 12 })
    state().setSetType(we.id, we.sets[0].id, 'warmup')
    state().toggleSetComplete(we.id, we.sets[0].id)
    state().toggleSetComplete(we.id, we.sets[1].id)

    const active = state().activeWorkout!
    expect(workoutWorkingSets(active)).toBe(1)
    expect(workoutVolumeKg(active)).toBe(55 * 8)
    expect(active.exercises.find((x) => x.id === we.id)!.sets[0].type).toBe('warmup')
  })

  it('supports adding, moving and removing exercises', () => {
    const before = state().activeWorkout!.exercises
    state().addExerciseToWorkout(SQUAT)
    const list = state().activeWorkout!.exercises
    const squatId = list[list.length - 1].id
    expect(list).toHaveLength(before.length + 1)

    // Moving up one place swaps it with the exercise above.
    const aboveId = list[list.length - 2].id
    state().moveWorkoutExercise(squatId, -1)
    const moved = state().activeWorkout!.exercises
    expect(moved[moved.length - 1].id).toBe(aboveId)
    expect(moved[moved.length - 2].id).toBe(squatId)

    // Push it to the top, then confirm a further up-move is a no-op.
    for (let i = 0; i < 10; i++) state().moveWorkoutExercise(squatId, -1)
    const atTop = state().activeWorkout!.exercises
    expect(atTop[0].id).toBe(squatId)
    state().moveWorkoutExercise(squatId, -1)
    expect(state().activeWorkout!.exercises.map((we) => we.id)).toEqual(atTop.map((we) => we.id))

    state().removeExerciseFromWorkout(squatId)
    expect(state().activeWorkout!.exercises.some((we) => we.id === squatId)).toBe(false)
  })

  it('stores per-exercise and per-workout notes', () => {
    const we = state().activeWorkout!.exercises[0]
    state().setExerciseNotes(we.id, 'Grip felt weak')
    state().setWorkoutNotes('Good session')
    expect(state().activeWorkout!.exercises[0].notes).toBe('Grip felt weak')
    expect(state().activeWorkout!.notes).toBe('Good session')
  })

  it('renames the active workout', () => {
    state().renameActiveWorkout('Push A')
    expect(state().activeWorkout!.name).toBe('Push A')
  })
})

describe('finishing a workout', () => {
  it('refuses to save a workout with no completed sets', () => {
    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    expect(state().finishWorkout()).toBeNull()
    expect(state().activeWorkout).not.toBeNull()
  })

  it('saves totals, PRs and duration into history and clears the active session', () => {
    useAppStore.setState({ history: [seedBenchHistory()] })
    state().startEmptyWorkout('Bench Day')
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().updateSet(we.id, we.sets[0].id, { weightKg: 60, reps: 6 })
    state().toggleSetComplete(we.id, we.sets[0].id)
    state().toggleSetComplete(we.id, we.sets[1].id)
    state().addClockSeconds(1800)

    const savedId = state().finishWorkout()
    expect(savedId).not.toBeNull()
    expect(state().activeWorkout).toBeNull()
    expect(state().clockAccumulatedSec).toBe(0)
    expect(state().restTimer).toBeNull()

    const saved = state().history.find((w) => w.id === savedId)!
    expect(saved.name).toBe('Bench Day')
    expect(saved.durationSec).toBe(1800)
    expect(saved.totalWorkingSets).toBe(2)
    expect(saved.totalVolumeKg).toBe(60 * 6 + 55 * 8)
    expect(saved.prsAchieved!.map((p) => p.kind)).toContain('weight')
    // Newest first.
    expect(state().history[0].id).toBe(savedId)
  })

  it('drops exercises that ended up with no completed sets', () => {
    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    state().addExerciseToWorkout(SQUAT)
    const bench = state().activeWorkout!.exercises[0]
    state().toggleSetComplete(bench.id, bench.sets[0].id)

    const savedId = state().finishWorkout()!
    const saved = state().history.find((w) => w.id === savedId)!
    expect(saved.exercises).toHaveLength(1)
    expect(saved.exercises[0].exerciseId).toBe(BENCH)
  })

  it('feeds the next session so the loop keeps getting faster', () => {
    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().updateSet(we.id, we.sets[0].id, { weightKg: 62.5, reps: 9 })
    state().toggleSetComplete(we.id, we.sets[0].id)
    state().finishWorkout()

    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    expect(state().activeWorkout!.exercises[0].sets[0]).toMatchObject({ weightKg: 62.5, reps: 9 })
  })

  it('removes a history entry and its derived records with it', () => {
    const workoutId = 'w-to-delete'
    useAppStore.setState({ history: [{ ...seedBenchHistory(), id: workoutId }] })
    state().deleteHistoryEntry(workoutId)
    expect(state().history).toHaveLength(0)
  })
})

describe('rest timer', () => {
  it('runs on a wall clock and can be adjusted, paused and resumed', () => {
    state().startRest(90)
    const timer = state().restTimer!
    expect(timer.totalSeconds).toBe(90)
    expect(timer.endsAt - Date.now()).toBeGreaterThan(88_000)

    state().addRestTime(15)
    expect(state().restTimer!.totalSeconds).toBe(105)
    expect(state().restTimer!.endsAt - Date.now()).toBeGreaterThan(103_000)

    state().pauseRest()
    const paused = state().restTimer!
    expect(paused.pausedRemainingMs).toBeGreaterThan(100_000)
    expect(paused.endsAt).toBe(timer.endsAt + 15_000)

    state().addRestTime(30)
    expect(state().restTimer!.pausedRemainingMs).toBeGreaterThan(130_000)

    state().resumeRest()
    expect(state().restTimer!.pausedRemainingMs).toBeNull()
    expect(state().restTimer!.endsAt).toBeGreaterThan(Date.now())

    state().skipRest()
    expect(state().restTimer).toBeNull()
  })
})

describe('routines', () => {
  it('creates, reorders and replaces routine exercises', () => {
    const routineId = state().createRoutine('Upper', [
      { exerciseId: BENCH, targetSets: 4 },
      { exerciseId: SQUAT, targetSets: 2 },
    ])
    let routine = state().routines.find((r) => r.id === routineId)!
    expect(routine.exercises.map((re) => re.exerciseId)).toEqual([BENCH, SQUAT])
    expect(routine.exercises[0].targetSets).toBe(4)

    state().replaceRoutineExercises(routineId, [{ exerciseId: SQUAT, targetSets: 5 }])
    routine = state().routines.find((r) => r.id === routineId)!
    expect(routine.exercises).toHaveLength(1)
    expect(routine.exercises[0]).toMatchObject({ exerciseId: SQUAT, targetSets: 5 })

    state().renameRoutine(routineId, 'Leg Day')
    state().setRoutineNotes(routineId, 'Heavy')
    routine = state().routines.find((r) => r.id === routineId)!
    expect(routine.name).toBe('Leg Day')
    expect(routine.notes).toBe('Heavy')

    state().deleteRoutine(routineId)
    expect(state().routines.some((r) => r.id === routineId)).toBe(false)
  })

  it('ships the four starter routines', () => {
    expect(state().routines.map((r) => r.name)).toEqual(['Push', 'Pull', 'Legs', 'Full Body'])
    const fullBody = state().routines.find((r) => r.name === 'Full Body')!
    expect(fullBody.exercises.map((re) => re.exerciseId)).toEqual([
      slugifyExerciseName('Squat'),
      slugifyExerciseName('Bench Press'),
      slugifyExerciseName('Barbell Row'),
      slugifyExerciseName('Overhead Press'),
      slugifyExerciseName('Barbell Curl'),
      slugifyExerciseName('Triceps Pushdown'),
    ])
  })
})

describe('custom exercises', () => {
  it('adds, finds and removes a user-created exercise', () => {
    const id = state().addCustomExercise({
      name: 'Landmine Press',
      primaryMuscle: 'Front Delts',
      secondaryMuscles: ['Triceps'],
      equipment: 'Barbell',
      category: 'Compound',
      instructions: 'Press at an angle.',
    })
    const created = state().customExercises.find((e) => e.id === id)!
    expect(created.name).toBe('Landmine Press')
    expect(created.muscleGroup).toBe('Shoulders')
    expect(created.isCustom).toBe(true)

    state().deleteCustomExercise(id)
    expect(state().customExercises).toHaveLength(0)
  })
})

describe('persistence', () => {
  it('writes logged sets to local storage as they happen', () => {
    state().startEmptyWorkout('Crash Test')
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().toggleSetComplete(we.id, we.sets[0].id)

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.activeWorkout.name).toBe('Crash Test')
    expect(parsed.state.activeWorkout.exercises[0].sets[0].completed).toBe(true)
  })

  it('restores an in-progress workout after the app is closed', async () => {
    state().startEmptyWorkout('Interrupted')
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().updateSet(we.id, we.sets[0].id, { weightKg: 80, reps: 5 })
    state().toggleSetComplete(we.id, we.sets[0].id)

    // Simulate a cold start: take a snapshot of what was on disk, blow the
    // in-memory state away, put the file back and rehydrate.
    const snapshot = localStorage.getItem(STORAGE_KEY)
    state().resetAll()
    localStorage.setItem(STORAGE_KEY, snapshot!)
    await useAppStore.persist.rehydrate()

    const restored = state().activeWorkout
    expect(restored?.name).toBe('Interrupted')
    expect(restored?.exercises[0].sets[0]).toMatchObject({ weightKg: 80, reps: 5, completed: true })
  })

  it('keeps history and preferences across a reload', async () => {
    state().updateUser({ unit: 'lb', defaultRestSeconds: 180, name: 'Marek' })
    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().toggleSetComplete(we.id, we.sets[0].id)
    state().finishWorkout()

    const historyLength = state().history.length
    await useAppStore.persist.rehydrate()

    expect(state().user.unit).toBe('lb')
    expect(state().user.defaultRestSeconds).toBe(180)
    expect(state().user.name).toBe('Marek')
    expect(state().history).toHaveLength(historyLength)
  })

  it('exports and re-imports a backup', () => {
    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().toggleSetComplete(we.id, we.sets[0].id)
    state().finishWorkout()

    const backup = state().exportData()
    state().resetAll()
    expect(state().history).toHaveLength(0)

    expect(state().importData(backup)).toEqual({ ok: true })
    expect(state().history).toHaveLength(1)
  })

  it('rejects junk on import instead of wiping data', () => {
    state().startEmptyWorkout()
    state().addExerciseToWorkout(BENCH)
    const we = state().activeWorkout!.exercises[0]
    state().toggleSetComplete(we.id, we.sets[0].id)
    state().finishWorkout()

    expect(state().importData('not json').ok).toBe(false)
    expect(state().importData('{"hello":"world"}').ok).toBe(false)
    expect(state().history).toHaveLength(1)
  })
})

describe('sample data', () => {
  it('loads a deterministic multi-week history that produces statistics', () => {
    state().loadSampleData()
    expect(state().history.length).toBeGreaterThan(20)
    // Loading twice must not duplicate.
    const count = state().history.length
    state().loadSampleData()
    expect(state().history.length).toBe(count)
  })
})
