import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  MoreVertical,
  Plus,
  Replace,
  StickyNote,
  Trash2,
  Trophy,
} from 'lucide-react'
import type { PRKind, SetType, Unit, WorkoutExercise, WorkoutSet } from '../types'
import { ExerciseThumb } from './ExerciseThumb'
import { SetRow, SetTableHeader } from './SetRow'
import { SetActionSheet } from './SetActionSheet'
import { Sheet } from './ui/Sheet'
import { Button, IconButton } from './ui/Button'
import { cn } from '../lib/cn'
import { formatWeight } from '../lib/units'
import { formatVolume } from '../lib/format'
import { exerciseVolumeKg, isWorkingSet, topSet } from '../lib/stats'
import { useExercise, usePreviousPerformance } from '../store/selectors'

export interface ExerciseCardActions {
  onChangeWeight: (setId: string, weightKg: number) => void
  onChangeReps: (setId: string, reps: number) => void
  /** Returns the PR kinds the completion broke, so the card can flag the row. */
  onToggle: (setId: string) => PRKind[]
  onAddSet: () => void
  onDeleteSet: (setId: string) => void
  onSetType: (setId: string, type: SetType) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onReplace: () => void
  onNotes: (notes: string) => void
  /** Called when a completion breaks a record, so the screen can toast it. */
  onPr: (kinds: PRKind[], set: WorkoutSet) => void
}

export interface ExerciseCardProps {
  workoutExercise: WorkoutExercise
  unit: Unit
  readOnly?: boolean
  reorderMode?: boolean
  index: number
  total: number
  actions: ExerciseCardActions
}

export function ExerciseCard({
  workoutExercise,
  unit,
  readOnly,
  reorderMode,
  index,
  total,
  actions,
}: ExerciseCardProps) {
  const exercise = useExercise(workoutExercise.exerciseId)
  const previous = usePreviousPerformance(workoutExercise.exerciseId)
  const [actionSetId, setActionSetId] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(workoutExercise.notes ?? '')
  const [prSetIds, setPrSetIds] = useState<string[]>([])

  const volume = exerciseVolumeKg(workoutExercise)
  const workingSets = workoutExercise.sets.filter(isWorkingSet).length
  const prevTop = useMemo(() => {
    if (!previous || previous.sets.length === 0) return null
    return topSet(
      previous.sets.map((s, i) => ({
        id: String(i),
        type: 'normal' as SetType,
        weightKg: s.weightKg,
        reps: s.reps,
        completed: true,
      })),
    )
  }, [previous])

  // Warm-ups get a "W" badge; working sets are numbered 1..n continuously.
  let workingIndex = 0
  const rows = workoutExercise.sets.map((set) => {
    if (set.type === 'warmup') return { set, label: 'W', prevIndex: null as number | null }
    const idx = workingIndex++
    return { set, label: String(idx + 1), prevIndex: idx }
  })

  const actionSet = workoutExercise.sets.find((s) => s.id === actionSetId) ?? null
  const actionLabel = rows.find((r) => r.set.id === actionSetId)?.label

  const handleToggle = (setId: string) => {
    const set = workoutExercise.sets.find((s) => s.id === setId)
    const kinds = actions.onToggle(setId)
    if (kinds.length > 0 && set) {
      setPrSetIds((ids) => (ids.includes(setId) ? ids : [...ids, setId]))
      actions.onPr(kinds, set)
    } else {
      setPrSetIds((ids) => ids.filter((id) => id !== setId))
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <header className="flex items-start gap-2.5 p-3">
        {reorderMode ? (
          <div className="flex flex-col gap-1 pt-0.5">
            <IconButton
              label="Move exercise up"
              size="sm"
              variant="subtle"
              disabled={index === 0}
              onClick={() => actions.onMove(-1)}
              className="!size-8"
            >
              <ArrowUp className="size-4" />
            </IconButton>
            <IconButton
              label="Move exercise down"
              size="sm"
              variant="subtle"
              disabled={index === total - 1}
              onClick={() => actions.onMove(1)}
              className="!size-8"
            >
              <ArrowDown className="size-4" />
            </IconButton>
          </div>
        ) : (
          <ExerciseThumb exercise={exercise ?? { name: '?', muscleGroup: 'Chest' }} />
        )}

        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="min-w-0 flex-1 text-left"
          aria-label={`${exercise?.name ?? 'Exercise'} details`}
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold text-ink">
              {exercise?.name ?? 'Unknown exercise'}
            </span>
            {prSetIds.length > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-prsoft px-1.5 py-0.5 text-[10px] font-bold text-pr uppercase">
                <Trophy className="size-3" />
                PR
              </span>
            ) : null}
            <ChevronRight className="size-4 shrink-0 text-subtle" />
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            <span className="truncate">
              {prevTop
                ? `Previous: ${formatWeight(prevTop.weightKg, unit)} ${unit} × ${prevTop.reps}`
                : 'No previous session'}
            </span>
            {exercise ? (
              <>
                <span className="text-linestrong">·</span>
                <span className="shrink-0">{exercise.muscleGroup}</span>
              </>
            ) : null}
          </span>
        </button>

        <IconButton label="Exercise options" onClick={() => setInfoOpen(true)}>
          <MoreVertical className="size-5" />
        </IconButton>
      </header>

      <div className="px-1.5 pb-2">
        {workoutExercise.sets.length > 0 ? <SetTableHeader /> : null}
        <div className="space-y-1">
          {rows.map(({ set, label, prevIndex }) => (
            <SetRow
              key={set.id}
              set={set}
              label={label}
              unit={unit}
              readOnly={readOnly}
              previous={prevIndex === null ? null : (previous?.sets[prevIndex] ?? previous?.sets.at(-1) ?? null)}
              onChangeWeight={(kg) => actions.onChangeWeight(set.id, kg)}
              onChangeReps={(reps) => actions.onChangeReps(set.id, reps)}
              onToggle={() => handleToggle(set.id)}
              onOpenActions={() => setActionSetId(set.id)}
            />
          ))}
        </div>
      </div>

      {!readOnly && !reorderMode ? (
        <div className="flex items-center gap-2 px-3 pb-3">
          <Button variant="subtle" block onClick={actions.onAddSet} className="border border-line">
            <Plus className="size-4" />
            Add Set
          </Button>
          <span className="tabular shrink-0 text-[11px] text-subtle">
            {workingSets} set{workingSets === 1 ? '' : 's'} · {formatVolume(volume, unit)}
          </span>
        </div>
      ) : null}

      {reorderMode ? (
        <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
          <Button variant="ghost" size="sm" onClick={() => setNotesOpen(true)}>
            <StickyNote className="size-4" />
            Note
          </Button>
          <span className="flex-1" />
          <Button variant="danger" size="sm" onClick={actions.onRemove}>
            <Trash2 className="size-4" />
            Remove
          </Button>
        </div>
      ) : null}

      <SetActionSheet
        open={actionSet !== null}
        set={actionSet}
        label={actionLabel}
        onClose={() => setActionSetId(null)}
        onSetType={(type) => actionSet && actions.onSetType(actionSet.id, type)}
        onDelete={() => actionSet && actions.onDeleteSet(actionSet.id)}
      />

      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title={exercise?.name ?? 'Exercise'}>
        <div className="space-y-3">
          {exercise ? (
            <>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <Chip>{exercise.primaryMuscle}</Chip>
                <Chip>{exercise.equipment}</Chip>
                <Chip>{exercise.category}</Chip>
                {exercise.secondaryMuscles.map((m) => (
                  <Chip key={m} muted>
                    {m}
                  </Chip>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{exercise.instructions}</p>
            </>
          ) : null}

          {previous ? (
            <div className="rounded-2xl border border-line bg-surface2 p-3">
              <p className="text-[11px] font-bold tracking-wide text-subtle uppercase">Last time</p>
              <p className="mt-1 text-[13px] text-ink">
                {previous.sets
                  .map((s) => `${formatWeight(s.weightKg, unit)} ${unit} × ${s.reps}`)
                  .join('   ')}
              </p>
            </div>
          ) : null}

          {workoutExercise.notes ? (
            <div className="rounded-2xl border border-line bg-surface2 p-3">
              <p className="text-[11px] font-bold tracking-wide text-subtle uppercase">Note</p>
              <p className="mt-1 text-[13px] text-ink">{workoutExercise.notes}</p>
            </div>
          ) : null}

          {!readOnly ? (
            <div className="space-y-2 pt-1">
              <Button
                variant="secondary"
                block
                onClick={() => {
                  setInfoOpen(false)
                  setNotesDraft(workoutExercise.notes ?? '')
                  setNotesOpen(true)
                }}
              >
                <StickyNote className="size-4" />
                {workoutExercise.notes ? 'Edit note' : 'Add note'}
              </Button>
              <Button
                variant="secondary"
                block
                onClick={() => {
                  setInfoOpen(false)
                  actions.onReplace()
                }}
              >
                <Replace className="size-4" />
                Replace exercise
              </Button>
              <Button
                variant="danger"
                block
                onClick={() => {
                  setInfoOpen(false)
                  actions.onRemove()
                }}
              >
                <Trash2 className="size-4" />
                Remove from workout
              </Button>
            </div>
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title="Note"
        subtitle={exercise?.name}
        footer={
          <Button
            block
            onClick={() => {
              actions.onNotes(notesDraft)
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
          placeholder="Felt strong, grip slipping on set 3…"
          className="w-full resize-none rounded-2xl border border-line bg-surface2 p-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
        />
      </Sheet>
    </section>
  )
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-lg px-2 py-1',
        muted ? 'bg-surface2 text-muted' : 'bg-accentsoft text-accent',
      )}
    >
      {children}
    </span>
  )
}

