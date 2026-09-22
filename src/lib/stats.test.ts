import { describe, expect, it } from 'vitest'
import type { MuscleGroup, Workout, WorkoutSet } from '../types'
import {
  accumulatePR,
  bestSetByOneRm,
  detectPrs,
  emptyPR,
  epley1RM,
  exerciseSessions,
  exerciseTotals,
  historyTotals,
  isWorkingSet,
  muscleGroupStats,
  previousPerformance,
  prForExercise,
  setBreaksRecords,
  topSet,
  weeklyStats,
  weightKey,
  workoutVolumeKg,
  workoutWarmupSets,
  workoutWorkingSets,
} from './stats'

let counter = 0
const id = (prefix: string) => `${prefix}-${++counter}`

function set(
  weightKg: number,
  reps: number,
  type: WorkoutSet['type'] = 'normal',
  completed = true,
): WorkoutSet {
  return { id: id('set'), type, weightKg, reps, completed, timestamp: completed ? 1 : undefined }
}

function workout(
  startedAt: number,
  exercises: { exerciseId: string; sets: WorkoutSet[] }[],
  name = 'Workout',
): Workout {
  return {
    id: id('w'),
    name,
    startedAt,
    finishedAt: startedAt + 3600_000,
    durationSec: 3600,
    exercises: exercises.map((e) => ({ id: id('we'), exerciseId: e.exerciseId, sets: e.sets })),
  }
}

const DAY = 86400_000
const NOW = new Date('2026-09-21T12:00:00Z').getTime()

describe('set counting rules', () => {
  it('excludes warm-up sets from volume and working-set counts', () => {
    const w = workout(NOW, [
      {
        exerciseId: 'bench',
        sets: [set(20, 12, 'warmup'), set(55, 8), set(55, 7), set(20, 12, 'warmup', false)],
      },
    ])
    expect(workoutVolumeKg(w)).toBe(55 * 8 + 55 * 7)
    expect(workoutWorkingSets(w)).toBe(2)
    expect(workoutWarmupSets(w)).toBe(1)
  })

  it('ignores incomplete sets entirely', () => {
    const w = workout(NOW, [{ exerciseId: 'bench', sets: [set(50, 5, 'normal', false), set(60, 5)] }])
    expect(workoutVolumeKg(w)).toBe(300)
    expect(workoutWorkingSets(w)).toBe(1)
  })

  it('treats only completed non-warm-ups as working sets', () => {
    expect(isWorkingSet(set(60, 5))).toBe(true)
    expect(isWorkingSet(set(20, 10, 'warmup'))).toBe(false)
    expect(isWorkingSet(set(60, 5, 'normal', false))).toBe(false)
    expect(isWorkingSet(set(60, 5, 'failure'))).toBe(true)
  })
})

describe('estimated 1RM', () => {
  it('uses Epley and clamps extreme rep ranges', () => {
    expect(epley1RM(100, 1)).toBe(100)
    expect(epley1RM(60, 6)).toBeCloseTo(72, 5)
    expect(epley1RM(0, 8)).toBe(0)
    expect(epley1RM(50, 0)).toBe(0)
    // Reps above 20 are clamped so the estimate can't run away.
    expect(epley1RM(50, 40)).toBeCloseTo(50 * (1 + 20 / 30), 5)
  })

  it('picks the best set by 1RM, not by raw weight', () => {
    const best = bestSetByOneRm([set(100, 1), set(80, 8)])
    expect(best?.weightKg).toBe(80)
    expect(best?.reps).toBe(8)
  })
})

describe('top set', () => {
  it('prefers heavier weight, then more reps', () => {
    expect(topSet([set(60, 5), set(60, 8), set(50, 12)])).toEqual({ weightKg: 60, reps: 8 })
  })

  it('returns null when nothing counts', () => {
    expect(topSet([set(20, 10, 'warmup')])).toBeNull()
  })
})

describe('previous performance', () => {
  const history = [
    workout(NOW - 7 * DAY, [
      { exerciseId: 'bench', sets: [set(20, 10, 'warmup'), set(55, 8), set(55, 8), set(55, 7)] },
    ]),
    workout(NOW - 2 * DAY, [{ exerciseId: 'bench', sets: [set(57.5, 8), set(57.5, 7)] }]),
    workout(NOW - 1 * DAY, [{ exerciseId: 'row', sets: [set(70, 6)] }]),
  ]

  it('returns the most recent session for that exercise, warm-ups stripped', () => {
    const previous = previousPerformance(history, 'bench')
    expect(previous?.sets).toEqual([
      { weightKg: 57.5, reps: 8 },
      { weightKg: 57.5, reps: 7 },
    ])
    expect(previous?.workoutId).toBe(history[1].id)
  })

  it('can exclude a specific workout', () => {
    const previous = previousPerformance(history, 'bench', { excludeWorkoutId: history[1].id })
    expect(previous?.workoutId).toBe(history[0].id)
    expect(previous?.sets[0]).toEqual({ weightKg: 55, reps: 8 })
  })

  it('returns null for an exercise never performed', () => {
    expect(previousPerformance(history, 'squat')).toBeNull()
  })
})

describe('prForExercise', () => {
  const history = [
    workout(NOW - 14 * DAY, [{ exerciseId: 'bench', sets: [set(50, 10), set(50, 8)] }]),
    workout(NOW - 7 * DAY, [{ exerciseId: 'bench', sets: [set(55, 8), set(55, 6)] }]),
    workout(NOW - 1 * DAY, [{ exerciseId: 'bench', sets: [set(60, 5), set(55, 12)] }]),
  ]

  it('tracks heaviest, best 1RM, best volume and max reps per weight', () => {
    const pr = prForExercise(history, 'bench')
    expect(pr.heaviest).toMatchObject({ weightKg: 60, reps: 5 })
    expect(pr.bestOneRm?.weightKg).toBe(55)
    expect(pr.bestOneRm?.reps).toBe(12)
    // Session volumes: 500+400=900, 440+330=770, 300+660=960
    expect(pr.bestVolume?.volumeKg).toBe(960)
    expect(pr.repsAtWeight[weightKey(55)]).toMatchObject({ reps: 12 })
    expect(pr.repsAtWeight[weightKey(50)]).toMatchObject({ reps: 10 })
  })

  it('ignores warm-up sets when recording records', () => {
    const withWarmup = [workout(NOW, [{ exerciseId: 'bench', sets: [set(200, 1, 'warmup'), set(60, 5)] }])]
    const pr = prForExercise(withWarmup, 'bench')
    expect(pr.heaviest).toMatchObject({ weightKg: 60 })
  })

  it('returns an empty record when there is no data', () => {
    expect(prForExercise([], 'bench')).toEqual(emptyPR('bench'))
  })
})

describe('detectPrs', () => {
  const baseline = [workout(NOW - 7 * DAY, [{ exerciseId: 'bench', sets: [set(55, 8), set(55, 6)] }])]

  it('reports nothing when an identical session is repeated', () => {
    const repeat = workout(NOW, [{ exerciseId: 'bench', sets: [set(55, 8), set(55, 6)] }])
    expect(detectPrs(repeat, baseline)).toEqual([])
  })

  it('reports heaviest weight and 1RM when the load goes up', () => {
    const heavier = workout(NOW, [{ exerciseId: 'bench', sets: [set(60, 6)] }])
    const prs = detectPrs(heavier, baseline)
    // No volume record: one set of 360 kg can't beat the previous 770 kg session.
    expect(prs.map((p) => p.kind).sort()).toEqual(['oneRm', 'weight'])
    const weightPr = prs.find((p) => p.kind === 'weight')!
    expect(weightPr).toMatchObject({ weightKg: 60, reps: 6, previousValue: 55 })
  })

  it('reports a session volume record when total work increases', () => {
    const moreWork = workout(NOW, [
      { exerciseId: 'bench', sets: [set(55, 8), set(55, 8), set(55, 8)] },
    ])
    const volumePr = detectPrs(moreWork, baseline).find((p) => p.kind === 'volume')!
    expect(volumePr).toMatchObject({ value: 55 * 24, previousValue: 55 * 14 })
  })

  it('reports best reps at a weight when the same load is beaten on reps', () => {
    const moreReps = workout(NOW, [{ exerciseId: 'bench', sets: [set(55, 10)] }])
    const repPr = detectPrs(moreReps, baseline).find((p) => p.kind === 'reps')!
    expect(repPr).toMatchObject({ weightKg: 55, reps: 10, previousValue: 8 })
  })

  it('flags a first-ever record with no previous value', () => {
    const first = workout(NOW, [{ exerciseId: 'squat', sets: [set(100, 5)] }])
    const prs = detectPrs(first, [])
    const weightPr = prs.find((p) => p.kind === 'weight')!
    expect(weightPr.previousValue).toBeNull()
  })

  it('only counts completed working sets', () => {
    const warmupOnly = workout(NOW, [{ exerciseId: 'bench', sets: [set(90, 5, 'warmup')] }])
    expect(detectPrs(warmupOnly, baseline)).toEqual([])
    const notDone = workout(NOW, [{ exerciseId: 'bench', sets: [set(90, 5, 'normal', false)] }])
    expect(detectPrs(notDone, baseline)).toEqual([])
  })
})

describe('setBreaksRecords', () => {
  const pr = accumulatePR(emptyPR('bench'), [set(55, 8)], NOW)

  it('reports weight and 1RM improvements', () => {
    expect(setBreaksRecords(set(60, 6), pr).sort()).toEqual(['oneRm', 'weight'])
  })

  it('reports reps at an already-used weight', () => {
    // More reps at the same load also nudges the estimated 1RM up.
    expect(setBreaksRecords(set(55, 9), pr)).toEqual(['reps', 'oneRm'])
  })

  it('stays quiet for equal or lighter sets', () => {
    expect(setBreaksRecords(set(55, 8), pr)).toEqual([])
    // Lighter weight, no rep record at that weight, lower 1RM — nothing to report.
    expect(setBreaksRecords(set(50, 10), pr)).toEqual([])
    // A rep record at a weight already in the table does register.
    const withFifty = accumulatePR(pr, [set(50, 10)], NOW)
    expect(setBreaksRecords(set(50, 12), withFifty)).toEqual(['reps', 'oneRm'])
  })

  it('never reports for warm-up sets', () => {
    expect(setBreaksRecords(set(200, 1, 'warmup'), pr)).toEqual([])
  })
})

describe('muscle group statistics', () => {
  const groups: Record<string, MuscleGroup> = { bench: 'Chest', row: 'Back', squat: 'Legs' }
  const groupOf = (exerciseId: string): MuscleGroup | undefined => groups[exerciseId]

  const history = [
    workout(NOW - 3 * DAY, [
      { exerciseId: 'bench', sets: [set(20, 10, 'warmup'), set(60, 8), set(60, 8)] },
      { exerciseId: 'row', sets: [set(70, 8)] },
    ]),
    workout(NOW - 1 * DAY, [
      { exerciseId: 'squat', sets: [set(100, 5), set(100, 5), set(100, 5)] },
      { exerciseId: 'bench', sets: [set(62.5, 6)] },
      { exerciseId: 'unknown', sets: [set(50, 5)] },
    ]),
  ]

  it('counts working sets per primary muscle group', () => {
    const stats = muscleGroupStats(history, groupOf)
    // Chest and Legs both have 3 sets, so volume and then name break the tie.
    expect(stats[0]).toEqual({ group: 'Legs', sets: 3, volumeKg: 1500 })
    expect(stats.find((s) => s.group === 'Chest')).toMatchObject({ sets: 3, volumeKg: 60 * 8 + 60 * 8 + 62.5 * 6 })
    expect(stats.find((s) => s.group === 'Back')).toMatchObject({ sets: 1 })
    // Unknown exercises are skipped rather than credited to a wrong group.
    expect(stats.reduce((sum, s) => sum + s.sets, 0)).toBe(7)
  })

  it('respects a date window', () => {
    const recent = muscleGroupStats(history, groupOf, { since: NOW - 2 * DAY })
    expect(recent.find((s) => s.group === 'Legs')).toMatchObject({ sets: 3 })
    expect(recent.find((s) => s.group === 'Back')).toBeUndefined()
  })
})

describe('exercise totals and sessions', () => {
  const history = [
    workout(NOW - 7 * DAY, [{ exerciseId: 'bench', sets: [set(55, 8), set(55, 7)] }]),
    workout(NOW - 1 * DAY, [{ exerciseId: 'bench', sets: [set(60, 6)] }]),
  ]

  it('rolls up sessions, volume, sets and records', () => {
    const totals = exerciseTotals(history, 'bench')
    expect(totals.timesPerformed).toBe(2)
    expect(totals.totalVolumeKg).toBe(55 * 8 + 55 * 7 + 60 * 6)
    expect(totals.totalWorkingSets).toBe(3)
    expect(totals.heaviest).toEqual({ weightKg: 60, reps: 6 })
    expect(totals.bestOneRm).toBeCloseTo(72, 5)
    expect(totals.lastPerformed).toBe(history[1].startedAt)
  })

  it('returns sessions oldest first with their volume', () => {
    const sessions = exerciseSessions(history, 'bench')
    expect(sessions.map((s) => s.volumeKg)).toEqual([825, 360])
    expect(sessions[0].date).toBeLessThan(sessions[1].date)
  })
})

describe('weekly stats', () => {
  it('buckets workouts into Monday-anchored weeks', () => {
    const history = [
      workout(NOW - 2 * DAY, [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      workout(NOW - 9 * DAY, [{ exerciseId: 'bench', sets: [set(55, 8)] }]),
    ]
    // NOW is a Monday, so the current week is the last bucket: the two prior
    // workouts land in the two weeks before it.
    const weeks = weeklyStats(history, 4, NOW)
    expect(weeks).toHaveLength(4)
    expect(weeks[3].workouts).toBe(0)
    expect(weeks[2].workouts).toBe(1)
    expect(weeks[2].workingSets).toBe(1)
    expect(weeks[2].volumeKg).toBe(60 * 8)
    expect(weeks[1].workouts).toBe(1)
    expect(weeks.reduce((sum, w) => sum + w.workouts, 0)).toBe(2)
  })

  it('is empty when there is no history', () => {
    const weeks = weeklyStats([], 3, NOW)
    expect(weeks.every((w) => w.workouts === 0 && w.volumeKg === 0)).toBe(true)
  })
})

describe('history totals', () => {
  it('summarises a brand-new user as zeroed', () => {
    const totals = historyTotals([])
    expect(totals.workouts).toBe(0)
    expect(totals.firstWorkoutAt).toBeNull()
    expect(totals.longestStreakDays).toBe(0)
  })

  it('counts volume, sets, active days and the longest streak', () => {
    const history = [
      workout(NOW - 3 * DAY, [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      workout(NOW - 2 * DAY, [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
      workout(NOW - 1 * DAY, [{ exerciseId: 'bench', sets: [set(60, 8)] }]),
    ]
    const totals = historyTotals(history)
    expect(totals.workouts).toBe(3)
    expect(totals.workingSets).toBe(3)
    expect(totals.volumeKg).toBe(60 * 8 * 3)
    expect(totals.activeDays).toBe(3)
    expect(totals.longestStreakDays).toBe(3)
    expect(totals.durationSec).toBe(3 * 3600)
  })
})

describe('weightKey', () => {
  it('buckets weights to the nearest half kilo', () => {
    expect(weightKey(55)).toBe('55')
    expect(weightKey(55.2)).toBe('55')
    expect(weightKey(55.4)).toBe('55.5')
  })
})
