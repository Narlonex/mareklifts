import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import type { RoutineExercise } from '../types'
import { PageHeader } from '../components/PageHeader'
import { ExerciseSelector } from '../components/ExerciseSelector'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { Button, IconButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Stepper } from '../components/ui/NumberField'
import { useAppStore } from '../store/useAppStore'
import { useExerciseMap } from '../store/selectors'
import { uid } from '../lib/id'
import { pluralize } from '../lib/format'

export function RoutineEditorScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const routines = useAppStore((s) => s.routines)
  const createRoutine = useAppStore((s) => s.createRoutine)
  const replaceRoutineExercises = useAppStore((s) => s.replaceRoutineExercises)
  const renameRoutine = useAppStore((s) => s.renameRoutine)
  const setRoutineNotes = useAppStore((s) => s.setRoutineNotes)
  const deleteRoutine = useAppStore((s) => s.deleteRoutine)
  const exerciseMap = useExerciseMap()

  const existing = useMemo(() => routines.find((r) => r.id === id), [routines, id])

  const [name, setName] = useState(existing?.name ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [exercises, setExercises] = useState<RoutineExercise[]>(existing?.exercises ?? [])
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Hydrate once the routine is available (deep links, or after rehydration).
  useEffect(() => {
    if (!existing) return
    setName((current) => current || existing.name)
    setNotes((current) => current || (existing.notes ?? ''))
    setExercises((current) => (current.length > 0 ? current : existing.exercises))
  }, [existing])

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= exercises.length) return
    setExercises((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const save = () => {
    const cleanName = name.trim() || 'New Routine'
    const entries = exercises.map((re) => ({
      exerciseId: re.exerciseId,
      targetSets: re.targetSets ?? 3,
    }))
    if (isNew) {
      const routineId = createRoutine(cleanName, entries)
      if (notes.trim()) setRoutineNotes(routineId, notes.trim())
    } else if (id) {
      // Name and notes are edited in place; the ordered exercise list is
      // replaced wholesale, which also drops anything the user removed.
      renameRoutine(id, cleanName)
      setRoutineNotes(id, notes.trim())
      replaceRoutineExercises(id, entries)
    }
    navigate('/workout')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title={isNew ? 'New Routine' : (existing?.name ?? 'Routine')}
        subtitle={pluralize(exercises.length, 'exercise')}
        back="/workout"
        right={
          !isNew ? (
            <IconButton label="Delete routine" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-5" />
            </IconButton>
          ) : null
        }
      />

      <main className="flex-1 space-y-4 px-3 py-3">
        <div>
          <label htmlFor="routine-name" className="mb-1.5 block px-1 text-[13px] font-bold tracking-wide text-muted uppercase">
            Routine name
          </label>
          <div className="relative">
            <input
              id="routine-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push"
              className="h-13 w-full rounded-2xl border border-line bg-surface px-3.5 py-3 text-[16px] font-semibold text-ink placeholder:font-normal placeholder:text-subtle focus:border-accent focus:outline-none"
            />
            <Pencil className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" />
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-bold tracking-wide text-muted uppercase">Exercises</h2>
            {exercises.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectorOpen(true)}
                className="flex items-center gap-1 text-[13px] font-bold text-accent"
              >
                <Plus className="size-4" />
                Add
              </button>
            ) : null}
          </div>

          {exercises.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="size-6" />}
              title="No exercises yet"
              message="Add the movements you want in this routine. You can reorder and set target sets afterwards."
              action={
                <Button block onClick={() => setSelectorOpen(true)}>
                  <Plus className="size-4" />
                  Add Exercise
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {exercises.map((re, index) => {
                const exercise = exerciseMap[re.exerciseId]
                return (
                  <li key={re.id}>
                    <Card className="p-2.5">
                      <div className="flex items-center gap-2.5">
                        <ExerciseThumb exercise={exercise ?? { name: '?', muscleGroup: 'Chest' }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-ink">
                            {index + 1}. {exercise?.name ?? 'Unknown exercise'}
                          </p>
                          <p className="truncate text-[11.5px] text-muted">
                            {exercise ? `${exercise.primaryMuscle} · ${exercise.equipment}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <IconButton
                            label="Move up"
                            size="sm"
                            variant="subtle"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                            className="!size-8"
                          >
                            <ArrowUp className="size-4" />
                          </IconButton>
                          <IconButton
                            label="Move down"
                            size="sm"
                            variant="subtle"
                            disabled={index === exercises.length - 1}
                            onClick={() => move(index, 1)}
                            className="!size-8"
                          >
                            <ArrowDown className="size-4" />
                          </IconButton>
                        </div>
                        <IconButton
                          label="Remove exercise"
                          variant="danger"
                          onClick={() => setExercises((prev) => prev.filter((x) => x.id !== re.id))}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
                        <span className="text-[12px] font-semibold text-muted">Target sets</span>
                        <Stepper
                          value={re.targetSets ?? 3}
                          step={1}
                          min={1}
                          max={10}
                          integer
                          label="target sets"
                          onChange={(value) =>
                            setExercises((prev) =>
                              prev.map((x) => (x.id === re.id ? { ...x, targetSets: value } : x)),
                            )
                          }
                        />
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div>
          <label htmlFor="routine-notes" className="mb-1.5 block px-1 text-[13px] font-bold tracking-wide text-muted uppercase">
            Notes (optional)
          </label>
          <textarea
            id="routine-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Warm up thoroughly, keep rest at 2 minutes…"
            className="w-full resize-none rounded-2xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
          />
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-line bg-canvas/95 px-3 pt-3 pb-safe backdrop-blur-lg">
        <Button block size="lg" onClick={save}>
          {isNew ? 'Create Routine' : 'Save Routine'}
        </Button>
      </div>

      <ExerciseSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title="Add to routine"
        onSelect={(ids) =>
          setExercises((prev) => [
            ...prev,
            ...ids.map((exerciseId) => ({ id: uid('re'), exerciseId, targetSets: 3 })),
          ])
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this routine?"
        message="Your logged workouts and history are not affected."
        confirmLabel="Delete routine"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (id) deleteRoutine(id)
          setDeleteOpen(false)
          navigate('/workout')
        }}
      />
    </div>
  )
}
