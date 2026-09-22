import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import type { Exercise, Equipment, MuscleGroup } from '../types'
import { MUSCLE_GROUPS, EQUIPMENT } from '../data/seedExercises'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { ExerciseThumb } from './ExerciseThumb'
import { EmptyState } from './ui/EmptyState'
import { cn } from '../lib/cn'
import { useAllExercises, useCustomExercises, useRecentExerciseIds } from '../store/selectors'
import { useAppStore } from '../store/useAppStore'

const GROUP_FILTERS: (MuscleGroup | 'All')[] = ['All', ...MUSCLE_GROUPS]

export interface ExerciseSelectorProps {
  open: boolean
  onClose: () => void
  /** Receives the chosen exercise ids, in the order they were tapped. */
  onSelect: (exerciseIds: string[]) => void
  title?: string
  /** Exercises already in the routine/workout — shown as added, not selectable. */
  existingIds?: string[]
  /** Single-tap mode: closes as soon as one exercise is picked. */
  single?: boolean
}

export function ExerciseSelector({
  open,
  onClose,
  onSelect,
  title = 'Add exercise',
  existingIds = [],
  single = false,
}: ExerciseSelectorProps) {
  const exercises = useAllExercises()
  const customs = useCustomExercises()
  const recentIds = useRecentExerciseIds(8)
  const addCustomExercise = useAppStore((s) => s.addCustomExercise)

  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'All'>('All')
  const [equipment, setEquipment] = useState<Equipment | 'All'>('All')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState<MuscleGroup>('Chest')

  useEffect(() => {
    if (open) {
      setQuery('')
      setGroup('All')
      setEquipment('All')
      setSelected([])
      setCreating(false)
      setNewName('')
    }
  }, [open])

  const existingSet = useMemo(() => new Set(existingIds), [existingIds])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => (group === 'All' ? true : e.muscleGroup === group))
      .filter((e) => (equipment === 'All' ? true : e.equipment === equipment))
      .filter((e) => {
        if (!q) return true
        return (
          e.name.toLowerCase().includes(q) ||
          e.primaryMuscle.toLowerCase().includes(q) ||
          e.equipment.toLowerCase().includes(q) ||
          e.secondaryMuscles.some((m) => m.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        // Recently used first, then custom exercises, then alphabetical.
        const ra = recentIds.indexOf(a.id)
        const rb = recentIds.indexOf(b.id)
        if (ra !== rb) {
          if (ra === -1) return 1
          if (rb === -1) return -1
          return ra - rb
        }
        if (!!b.isCustom !== !!a.isCustom) return b.isCustom ? 1 : -1
        return a.name.localeCompare(b.name)
      })
  }, [exercises, group, equipment, query, recentIds])

  const toggle = (id: string) => {
    if (existingSet.has(id)) return
    if (single) {
      onSelect([id])
      onClose()
      return
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const createCustom = () => {
    const name = newName.trim()
    if (!name) return
    const id = addCustomExercise({
      name,
      primaryMuscle: PRIMARY_FOR_GROUP[newGroup],
      equipment: 'Other',
      category: 'Compound',
    })
    if (single) {
      onSelect([id])
      onClose()
    } else {
      setSelected((prev) => [...prev, id])
      setCreating(false)
      setNewName('')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`${exercises.length} exercises`}
      footer={
        creating ? (
          <div className="space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Exercise name"
              autoFocus
              className="h-12 w-full rounded-2xl border border-line bg-surface2 px-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
            />
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              {MUSCLE_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setNewGroup(g)}
                  className={cn(
                    'h-9 shrink-0 rounded-xl px-3 text-[13px] font-semibold',
                    newGroup === g ? 'bg-accent text-onaccent' : 'bg-surface2 text-muted',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button block disabled={!newName.trim()} onClick={createCustom}>
                Create
              </Button>
            </div>
          </div>
        ) : selected.length > 0 ? (
          <Button
            block
            onClick={() => {
              onSelect(selected)
              onClose()
            }}
          >
            Add {selected.length} exercise{selected.length === 1 ? '' : 's'}
          </Button>
        ) : (
          <Button variant="secondary" block onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Create custom exercise
          </Button>
        )
      }
    >
      <div className="space-y-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="h-12 w-full rounded-2xl border border-line bg-surface2 pr-10 pl-9 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {GROUP_FILTERS.map((g) => (
            <FilterChip key={g} active={group === g} onClick={() => setGroup(g)}>
              {g}
            </FilterChip>
          ))}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <FilterChip active={equipment === 'All'} onClick={() => setEquipment('All')} subtle>
            Any equipment
          </FilterChip>
          {EQUIPMENT.map((eq) => (
            <FilterChip
              key={eq}
              active={equipment === eq}
              onClick={() => setEquipment(equipment === eq ? 'All' : eq)}
              subtle
            >
              {eq}
            </FilterChip>
          ))}
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={`No match for "${query}"`}
            message="Try a different name or muscle group, or create your own exercise."
            action={
              <Button variant="secondary" block onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Create "{query.trim()}"
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1.5">
            {results.map((exercise) => (
              <ExerciseOption
                key={exercise.id}
                exercise={exercise}
                added={existingSet.has(exercise.id)}
                selected={selected.includes(exercise.id)}
                onClick={() => toggle(exercise.id)}
              />
            ))}
          </ul>
        )}

        {customs.length > 0 ? (
          <p className="pt-1 text-center text-[11px] text-subtle">
            {customs.length} custom exercise{customs.length === 1 ? '' : 's'} in your library
          </p>
        ) : null}
      </div>
    </Sheet>
  )
}

function FilterChip({
  active,
  subtle,
  onClick,
  children,
}: {
  active: boolean
  subtle?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 rounded-xl px-3 text-[13px] font-semibold transition-colors',
        active
          ? 'bg-accent text-onaccent'
          : subtle
            ? 'bg-surface text-muted ring-1 ring-line ring-inset'
            : 'bg-surface2 text-muted',
      )}
    >
      {children}
    </button>
  )
}

export function ExerciseOption({
  exercise,
  added,
  selected,
  onClick,
}: {
  exercise: Exercise
  added?: boolean
  selected?: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={added}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors',
          selected ? 'border-accent bg-accentsoft' : 'border-line bg-surface active:bg-surface2',
          added && 'opacity-55',
        )}
      >
        <ExerciseThumb exercise={exercise} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{exercise.name}</span>
          <span className="block truncate text-[12px] text-muted">
            {exercise.primaryMuscle} · {exercise.equipment}
            {exercise.isCustom ? ' · Custom' : ''}
          </span>
        </span>
        {added ? (
          <span className="shrink-0 text-[11px] font-bold text-muted uppercase">Added</span>
        ) : (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg border',
              selected ? 'border-accent bg-accent text-onaccent' : 'border-line text-subtle',
            )}
          >
            {selected ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" />}
          </span>
        )}
      </button>
    </li>
  )
}

/** Default primary muscle used when creating a custom exercise in a group. */
const PRIMARY_FOR_GROUP: Record<MuscleGroup, Exercise['primaryMuscle']> = {
  Chest: 'Chest',
  Back: 'Lats',
  Shoulders: 'Front Delts',
  Arms: 'Biceps',
  Legs: 'Quads',
  Core: 'Abs',
}
