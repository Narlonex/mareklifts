import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ListOrdered, MoreVertical, Plus, StickyNote } from 'lucide-react'
import type { PRKind, WorkoutSet } from '../types'
import { ExerciseCard, type ExerciseCardActions } from '../components/ExerciseCard'
import { ExerciseSelector } from '../components/ExerciseSelector'
import { RestTimerBar, RestTimerChip, RestTimerSheet } from '../components/RestTimer'
import { PrToast, type PrToastData } from '../components/PrToast'
import { Button, IconButton } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Sheet } from '../components/ui/Sheet'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import { formatClock, formatVolume, pluralize } from '../lib/format'
import { haptics, releaseWakeLock, requestWakeLock } from '../lib/feedback'
import { uid } from '../lib/id'
import { workoutVolumeKg, workoutWorkingSets } from '../lib/stats'
import { useAppStore } from '../store/useAppStore'
import { useExerciseMap, useRecentExerciseIds } from '../store/selectors'
import { useRestRemaining, useWorkoutClock } from '../hooks/useTimers'

export function ActiveWorkoutScreen() {
  const navigate = useNavigate()
  const workout = useAppStore((s) => s.activeWorkout)
  const unit = useAppStore((s) => s.user.unit)
  const addExerciseToWorkout = useAppStore((s) => s.addExerciseToWorkout)
  const removeExerciseFromWorkout = useAppStore((s) => s.removeExerciseFromWorkout)
  const moveWorkoutExercise = useAppStore((s) => s.moveWorkoutExercise)
  const setExerciseNotes = useAppStore((s) => s.setExerciseNotes)
  const replaceExercise = useAppStore((s) => s.replaceExercise)
  const addSet = useAppStore((s) => s.addSet)
  const updateSet = useAppStore((s) => s.updateSet)
  const deleteSet = useAppStore((s) => s.deleteSet)
  const setSetType = useAppStore((s) => s.setSetType)
  const toggleSetComplete = useAppStore((s) => s.toggleSetComplete)
  const finishWorkout = useAppStore((s) => s.finishWorkout)
  const cancelActiveWorkout = useAppStore((s) => s.cancelActiveWorkout)
  const renameActiveWorkout = useAppStore((s) => s.renameActiveWorkout)
  const setWorkoutNotes = useAppStore((s) => s.setWorkoutNotes)
  const startRest = useAppStore((s) => s.startRest)

  const exerciseMap = useExerciseMap()
  const recentIds = useRecentExerciseIds(6)
  const elapsed = useWorkoutClock()
  const restRemaining = useRestRemaining()

  const [selectorOpen, setSelectorOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null)
  const [timerOpen, setTimerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [toasts, setToasts] = useState<PrToastData[]>([])
  /** True once the user has committed to finish or discard this workout. */
  const leaving = useRef(false)

  // Nothing to log? Then this screen has no business being open. The guard is
  // suppressed while we are deliberately leaving (finish/discard), otherwise it
  // would race the navigation to the post-workout summary and swallow it.
  useEffect(() => {
    if (!workout && !leaving.current) navigate('/workout', { replace: true })
  }, [workout, navigate])

  // Keep the screen on while training.
  useEffect(() => {
    void requestWakeLock()
    return () => {
      void releaseWakeLock()
    }
  }, [])

  const pushPrToast = useCallback(
    (kinds: PRKind[], set: WorkoutSet, exerciseId: string) => {
      haptics.pr()
      const data: PrToastData = {
        id: uid('pr'),
        exerciseName: exerciseMap[exerciseId]?.name ?? 'Exercise',
        kinds,
        weightKg: set.weightKg,
        reps: set.reps,
        unit,
      }
      setToasts((prev) => [data, ...prev].slice(0, 3))
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== data.id)), 4200)
    },
    [exerciseMap, unit],
  )

  const volume = workout ? workoutVolumeKg(workout) : 0
  const workingSets = workout ? workoutWorkingSets(workout) : 0
  const canFinish = workingSets > 0

  const makeActions = useMemo(
    () =>
      (workoutExerciseId: string, exerciseId: string): ExerciseCardActions => ({
        onChangeWeight: (setId, weightKg) => updateSet(workoutExerciseId, setId, { weightKg }),
        onChangeReps: (setId, reps) => updateSet(workoutExerciseId, setId, { reps }),
        onToggle: (setId) => toggleSetComplete(workoutExerciseId, setId).prKinds,
        onAddSet: () => addSet(workoutExerciseId),
        onDeleteSet: (setId) => deleteSet(workoutExerciseId, setId),
        onSetType: (setId, type) => setSetType(workoutExerciseId, setId, type),
        onMove: (direction) => moveWorkoutExercise(workoutExerciseId, direction),
        onRemove: () => removeExerciseFromWorkout(workoutExerciseId),
        onReplace: () => setReplaceTarget(workoutExerciseId),
        onNotes: (notes) => setExerciseNotes(workoutExerciseId, notes),
        onPr: (kinds, set) => pushPrToast(kinds, set, exerciseId),
      }),
    [
      addSet,
      deleteSet,
      moveWorkoutExercise,
      pushPrToast,
      removeExerciseFromWorkout,
      setExerciseNotes,
      setSetType,
      toggleSetComplete,
      updateSet,
    ],
  )

  if (!workout) return null

  const handleFinish = () => {
    leaving.current = true
    const id = finishWorkout()
    setFinishOpen(false)
    if (id) {
      navigate(`/workout/summary/${id}`, { replace: true })
    } else {
      // Nothing was logged, so the workout was not saved — stay put.
      leaving.current = false
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/92 pt-safe backdrop-blur-lg">
        <div className="flex items-center gap-1.5 px-2 pt-1">
          <IconButton label="Back to workouts" onClick={() => navigate('/workout')}>
            <ArrowLeft className="size-5" />
          </IconButton>
          <button
            type="button"
            onClick={() => {
              setNameDraft(workout.name)
              setNameOpen(true)
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-[17px] leading-tight font-bold text-ink">{workout.name}</span>
            <span className="tabular block text-[11px] text-muted">
              {formatClock(elapsed)} · {formatVolume(volume, unit)} · {pluralize(workingSets, 'set')}
            </span>
          </button>
          <RestTimerChip onClick={() => setTimerOpen(true)} />
          <IconButton label="Workout options" onClick={() => setMenuOpen(true)}>
            <MoreVertical className="size-5" />
          </IconButton>
        </div>

        <div className="flex items-center gap-2 px-3 pt-2 pb-2.5">
          <Button block onClick={() => setFinishOpen(true)} disabled={!canFinish}>
            <Check className="size-4" strokeWidth={3} />
            Finish Workout
          </Button>
          {workout.exercises.length > 1 ? (
            <IconButton
              label={reorderMode ? 'Done reordering' : 'Reorder exercises'}
              variant={reorderMode ? 'subtle' : 'ghost'}
              onClick={() => setReorderMode((v) => !v)}
            >
              <ListOrdered className="size-5" />
            </IconButton>
          ) : null}
        </div>

        {reorderMode ? (
          <div className="border-t border-line bg-accentsoft px-3 py-2 text-center text-[12px] font-semibold text-accent">
            Use the arrows to reorder exercises, then tap the list icon to finish.
          </div>
        ) : null}
      </header>

      {toasts.length > 0 ? (
        <div className="space-y-2 px-3 pt-3">
          {toasts.map((toast) => (
            <PrToast
              key={toast.id}
              data={toast}
              onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            />
          ))}
        </div>
      ) : null}

      <main className={cn('flex-1 px-3 pt-3', restRemaining !== null ? 'pb-32' : 'pb-28')}>
        {workout.exercises.length === 0 ? (
          <EmptyState
            icon={<Plus className="size-6" />}
            title="Add your first exercise"
            message="Pick from the library, or jump straight into a recent movement."
            action={
              <Button block onClick={() => setSelectorOpen(true)}>
                <Plus className="size-4" />
                Add Exercise
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {workout.exercises.map((we, index) => (
              <ExerciseCard
                key={we.id}
                workoutExercise={we}
                unit={unit}
                index={index}
                total={workout.exercises.length}
                reorderMode={reorderMode}
                actions={makeActions(we.id, we.exerciseId)}
              />
            ))}
          </div>
        )}

        {recentIds.length > 0 && workout.exercises.length > 0 && !reorderMode ? (
          <div className="mt-3">
            <p className="mb-1.5 px-1 text-[11px] font-bold tracking-wide text-subtle uppercase">Quick add</p>
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {recentIds
                .filter((id) => !workout.exercises.some((we) => we.exerciseId === id))
                .map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => addExerciseToWorkout(id)}
                    className="h-10 shrink-0 rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink shadow-card active:bg-surface2"
                  >
                    + {exerciseMap[id]?.name ?? 'Exercise'}
                  </button>
                ))}
            </div>
          </div>
        ) : null}

        {!reorderMode ? (
          <div className="mt-3 space-y-2">
            <Button variant="secondary" block onClick={() => setSelectorOpen(true)}>
              <Plus className="size-4" />
              Add Exercise
            </Button>
            <Button
              variant="ghost"
              block
              onClick={() => {
                setNotesDraft(workout.notes ?? '')
                setNotesOpen(true)
              }}
            >
              <StickyNote className="size-4" />
              {workout.notes ? 'Edit workout note' : 'Add workout note'}
            </Button>
            <Button variant="ghost" block onClick={() => startRest()}>
              Start rest timer
            </Button>
          </div>
        ) : null}

        {workout.notes ? (
          <p className="mt-3 rounded-2xl border border-line bg-surface p-3 text-[13px] text-muted">{workout.notes}</p>
        ) : null}
      </main>

      <RestTimerBar onExpand={() => setTimerOpen(true)} />

      <ExerciseSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        title="Add exercise"
        existingIds={workout.exercises.map((we) => we.exerciseId)}
        onSelect={(ids) => ids.forEach((id) => addExerciseToWorkout(id))}
      />

      <ExerciseSelector
        open={replaceTarget !== null}
        onClose={() => setReplaceTarget(null)}
        title="Replace exercise"
        single
        onSelect={(ids) => {
          if (replaceTarget && ids[0]) replaceExercise(replaceTarget, ids[0])
        }}
      />

      <RestTimerSheet open={timerOpen} onClose={() => setTimerOpen(false)} />

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Workout options"
        subtitle={workout.name}
      >
        <div className="space-y-2 pb-1">
          <Button
            variant="secondary"
            block
            onClick={() => {
              setMenuOpen(false)
              setNameDraft(workout.name)
              setNameOpen(true)
            }}
          >
            Rename workout
          </Button>
          <Button
            variant="secondary"
            block
            onClick={() => {
              setMenuOpen(false)
              setReorderMode(true)
            }}
          >
            <ListOrdered className="size-4" />
            Reorder exercises
          </Button>
          <Button
            variant="secondary"
            block
            onClick={() => {
              setMenuOpen(false)
              setNotesDraft(workout.notes ?? '')
              setNotesOpen(true)
            }}
          >
            <StickyNote className="size-4" />
            Workout note
          </Button>
          <Button
            variant="danger"
            block
            onClick={() => {
              setMenuOpen(false)
              setDiscardOpen(true)
            }}
          >
            Discard workout
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        title="Workout name"
        footer={
          <Button
            block
            onClick={() => {
              renameActiveWorkout(nameDraft.trim() || workout.name)
              setNameOpen(false)
            }}
          >
            Save name
          </Button>
        }
      >
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          autoFocus
          placeholder="e.g. Push day"
          className="h-12 w-full rounded-2xl border border-line bg-surface2 px-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
        />
      </Sheet>

      <Sheet
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title="Workout note"
        footer={
          <Button
            block
            onClick={() => {
              setWorkoutNotes(notesDraft)
              setNotesOpen(false)
            }}
          >
            Save note
          </Button>
        }
      >
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={4}
          placeholder="How did the session feel?"
          className="w-full resize-none rounded-2xl border border-line bg-surface2 p-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
        />
      </Sheet>

      <ConfirmDialog
        open={finishOpen}
        title="Finish workout?"
        message={
          <>
            {pluralize(workout.exercises.length, 'exercise')} · {pluralize(workingSets, 'working set')} ·{' '}
            {formatVolume(volume, unit)}. It will be saved to your history.
          </>
        }
        confirmLabel="Finish & save"
        onConfirm={handleFinish}
        onCancel={() => setFinishOpen(false)}
      />

      <ConfirmDialog
        open={discardOpen}
        title="Discard this workout?"
        message="All sets logged in this session will be deleted. This cannot be undone."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          leaving.current = true
          cancelActiveWorkout()
          setDiscardOpen(false)
          navigate('/workout', { replace: true })
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  )
}
