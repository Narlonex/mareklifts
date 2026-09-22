import type { Exercise, MuscleGroup } from '../types'
import { cn } from '../lib/cn'

/**
 * Original placeholder tile for the "demonstration image" slot.
 *
 * Deliberately generated from the exercise's own metadata (a monogram tinted by
 * muscle group) rather than any photographic asset, so nothing third-party is
 * reproduced and every exercise has a consistent visual identity.
 */

const GROUP_COLORS: Record<MuscleGroup, string> = {
  Chest: '#2563eb',
  Back: '#4f46e5',
  Shoulders: '#7c3aed',
  Arms: '#0891b2',
  Legs: '#059669',
  Core: '#b45309',
}

export function muscleGroupColor(group: MuscleGroup | undefined): string {
  return group ? GROUP_COLORS[group] : '#64748b'
}

const SIZES = {
  sm: 'size-9 text-[11px] rounded-lg',
  md: 'size-11 text-[13px] rounded-xl',
  lg: 'size-14 text-base rounded-2xl',
}

function monogram(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function ExerciseThumb({
  exercise,
  size = 'md',
  className,
}: {
  exercise: Pick<Exercise, 'name' | 'muscleGroup'>
  size?: keyof typeof SIZES
  className?: string
}) {
  const color = muscleGroupColor(exercise.muscleGroup)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center font-bold tracking-tight ring-1 ring-inset',
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: `${color}1f`,
        color,
        // ring colour follows the tint without needing a Tailwind class per group
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      {monogram(exercise.name)}
    </span>
  )
}
