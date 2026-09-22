import type { Unit } from '../types'
import type { MuscleGroupStat } from '../lib/stats'
import { formatVolume, pluralize } from '../lib/format'
import { muscleGroupColor } from './ExerciseThumb'

export function MuscleGroupBars({
  stats,
  unit,
  showVolume,
}: {
  stats: MuscleGroupStat[]
  unit: Unit
  showVolume?: boolean
}) {
  if (stats.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-[13px] text-muted">
        No sets logged in this period yet.
      </p>
    )
  }

  const max = Math.max(...stats.map((s) => s.sets))

  return (
    <div className="space-y-2.5">
      {stats.map((stat) => (
        <div key={stat.group} className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-[13px] font-semibold text-ink">{stat.group}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2">
            <span
              className="block h-full rounded-full transition-[width]"
              style={{
                width: `${(stat.sets / max) * 100}%`,
                backgroundColor: muscleGroupColor(stat.group),
              }}
            />
          </span>
          <span className="tabular w-16 shrink-0 text-right text-[12px] font-semibold text-muted">
            {showVolume ? formatVolume(stat.volumeKg, unit) : pluralize(stat.sets, 'set')}
          </span>
        </div>
      ))}
    </div>
  )
}
