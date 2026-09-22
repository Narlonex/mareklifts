import { Trophy } from 'lucide-react'
import type { PRKind, Unit } from '../types'
import { PR_LABELS } from '../lib/stats'
import { formatWeight } from '../lib/units'
import { cn } from '../lib/cn'

export interface PrToastData {
  id: string
  exerciseName: string
  kinds: PRKind[]
  weightKg: number
  reps: number
  unit: Unit
}

const KIND_SHORT: Record<PRKind, string> = {
  weight: 'Heaviest weight',
  reps: 'Best reps at weight',
  oneRm: 'Best estimated 1RM',
  volume: 'Best volume',
}

export function PrToast({ data, onDismiss }: { data: PrToastData; onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={cn(
        'animate-toast-in w-full rounded-2xl border border-pr/30 bg-prsoft p-3 text-left shadow-lift',
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pr text-onaccent">
          <Trophy className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold tracking-wide text-pr uppercase">New PR!</span>
          <span className="block truncate text-sm font-bold text-ink">{data.exerciseName}</span>
          <span className="tabular block text-[12px] font-semibold text-muted">
            {formatWeight(data.weightKg, data.unit)} {data.unit} × {data.reps}
            <span className="font-normal"> · {data.kinds.map((k) => KIND_SHORT[k] ?? PR_LABELS[k]).join(', ')}</span>
          </span>
        </span>
      </div>
    </button>
  )
}
