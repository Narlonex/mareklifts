import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Unit } from '../types'
import { EmptyState } from './ui/EmptyState'
import { formatShortDate } from '../lib/format'
import { formatWeight } from '../lib/units'
import { useChartColors } from '../hooks/useTheme'

export type ChartMetric = 'weight' | 'volume' | 'oneRm'

export interface ProgressPoint {
  date: number
  value: number
  label: string
}

export const METRIC_LABELS: Record<ChartMetric, string> = {
  weight: 'Weight',
  volume: 'Volume',
  oneRm: 'Est. 1RM',
}

export function ProgressChart({
  data,
  metric,
  unit,
  height = 200,
  emptyMessage = 'Log this exercise a few times to see your trend.',
}: {
  data: ProgressPoint[]
  metric: ChartMetric
  unit: Unit
  height?: number
  emptyMessage?: string
}) {
  const colors = useChartColors()

  if (data.length === 0) {
    return <EmptyState className="py-6" title="No data yet" message={emptyMessage} />
  }

  const formatValue = (value: number) =>
    metric === 'volume' ? `${Math.round(value).toLocaleString()}` : formatWeight(value, unit)

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, max * 0.02, 0.5)

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: number) => formatShortDate(v)}
            tick={{ fill: colors.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={18}
          />
          <YAxis
            tick={{ fill: colors.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tickFormatter={(v: number) => (metric === 'volume' ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as ProgressPoint
              return (
                <div className="rounded-xl border border-line bg-surface px-2.5 py-1.5 shadow-lift">
                  <p className="text-[11px] font-semibold text-muted">{formatShortDate(point.date)}</p>
                  <p className="tabular text-sm font-bold text-ink">
                    {formatValue(point.value)} {unit}
                  </p>
                  <p className="text-[11px] text-subtle">{point.label}</p>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.line}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: colors.line, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


