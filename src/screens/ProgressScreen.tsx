import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, TrendingUp, Trophy } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ProgressChart, type ChartMetric } from '../components/ProgressChart'
import { MuscleGroupBars } from '../components/MuscleGroupBars'
import { PerformedExercisePicker } from '../components/PerformedExercisePicker'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { StatTile } from '../components/ui/StatTile'
import { NAV_SPACER } from '../components/AppLayout'
import { cn } from '../lib/cn'
import { formatDate, formatShortDate, formatVolume, pluralize } from '../lib/format'
import { formatWeight } from '../lib/units'
import { prForExercise, weeklyStats, workoutVolumeKg, workoutWorkingSets } from '../lib/stats'
import { useAppStore } from '../store/useAppStore'
import {
  useExerciseChart,
  useExerciseMap,
  useExerciseSessions,
  useExerciseTotals,
  useHistory,
  useMuscleStats,
  useRankedExercises,
} from '../store/selectors'

type Window = '7d' | '30d' | '90d' | 'all'

const WINDOW_DAYS: Record<Window, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null }

/** Weekly bar chart geometry, in pixels. */
const CHART_TRACK_HEIGHT = 128
const BAR_MAX_HEIGHT = CHART_TRACK_HEIGHT - 20 // leave room for the axis label

export function ProgressScreen() {
  const navigate = useNavigate()
  const unit = useAppStore((s) => s.user.unit)
  const history = useHistory()
  const exerciseMap = useExerciseMap()

  const [range, setRange] = useState<Window>('30d')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [metric, setMetric] = useState<ChartMetric>('weight')

  const ranked = useRankedExercises()
  const activeId = selectedId ?? ranked[0]?.exerciseId ?? null

  const since = useMemo(() => {
    const days = WINDOW_DAYS[range]
    if (days === null) return undefined
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime() - (days - 1) * 86400000
  }, [range])

  const windowStats = useMemo(() => {
    const list = since === undefined ? history : history.filter((w) => w.startedAt >= since)
    return {
      workouts: list.length,
      sets: list.reduce((sum, w) => sum + (w.totalWorkingSets ?? workoutWorkingSets(w)), 0),
      volume: list.reduce((sum, w) => sum + (w.totalVolumeKg ?? workoutVolumeKg(w)), 0),
    }
  }, [history, since])

  const muscleStats = useMuscleStats(since)
  const weekly = useMemo(() => weeklyStats(history, 12), [history])
  const maxWeeklyVolume = Math.max(1, ...weekly.map((w) => w.volumeKg))

  const chartData = useExerciseChart(activeId, metric)
  const activeTotals = useExerciseTotals(activeId)
  const activeSessions = useExerciseSessions(activeId)
  const activeExercise = activeId ? exerciseMap[activeId] : undefined

  const records = useMemo(
    () =>
      ranked
        .map(({ exerciseId }) => ({ exerciseId, pr: prForExercise(history, exerciseId) }))
        .filter((r) => r.pr.heaviest !== null)
        .sort((a, b) => (b.pr.bestOneRm?.value ?? 0) - (a.pr.bestOneRm?.value ?? 0))
        .slice(0, 8),
    [ranked, history],
  )

  if (history.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader large title="Progress" subtitle="Strength, volume and consistency" />
        <main className="flex-1 px-3 pt-3">
          <EmptyState
            icon={<TrendingUp className="size-6" />}
            title="Nothing to chart yet"
            message="Log a workout and this tab fills up with weight, volume and estimated 1RM trends, muscle-group splits and personal records."
            action={
              <Button block onClick={() => navigate('/workout')}>
                Go to Workout
              </Button>
            }
          />
          <div className={NAV_SPACER} />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader large title="Progress" subtitle="Strength, volume and consistency" />

      <main className="flex-1 space-y-5 px-3 pt-3">
        <SegmentedControl<Window>
          value={range}
          onChange={setRange}
          options={[
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
            { value: 'all', label: 'All time' },
          ]}
        />

        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="Workouts" value={String(windowStats.workouts)} />
          <StatTile label="Sets" value={String(windowStats.sets)} />
          <StatTile label="Volume" value={formatVolume(windowStats.volume, unit)} tone="accent" />
        </div>

        <section>
          <SectionHeader title="Sets per muscle group" />
          <Card className="p-3.5">
            <MuscleGroupBars stats={muscleStats} unit={unit} />
            <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-subtle">
              Each working set counts toward the exercise's primary muscle. Warm-up sets are excluded.
            </p>
          </Card>
        </section>

        <section>
          <SectionHeader title="Volume per week" />
          <Card className="p-3.5">
            {/* Bars are sized in pixels against a fixed track: percentage
                heights inside nested flex columns collapse to zero. */}
            <div className="flex items-end gap-1.5" style={{ height: CHART_TRACK_HEIGHT }}>
              {weekly.map((week, index) => {
                const ratio = maxWeeklyVolume > 0 ? week.volumeKg / maxWeeklyVolume : 0
                const height =
                  week.volumeKg > 0 ? Math.max(Math.round(ratio * BAR_MAX_HEIGHT), 4) : 3
                return (
                  <div
                    key={week.weekStart}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-[height]',
                        week.volumeKg > 0 ? 'bg-accent' : 'bg-surface2',
                      )}
                      style={{ height }}
                      title={`${formatVolume(week.volumeKg, unit)} · ${pluralize(week.workouts, 'workout')}`}
                    />
                    <span className="h-3 text-[9px] leading-3 font-semibold text-subtle">
                      {index % 4 === 0 || index === weekly.length - 1
                        ? formatShortDate(week.weekStart).split(' ')[1]
                        : ''}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2.5 text-[12px] text-muted">
              Last 12 weeks ·{' '}
              <span className="tabular font-semibold text-ink">
                {formatVolume(weekly.reduce((sum, w) => sum + w.volumeKg, 0), unit)}
              </span>{' '}
              total
            </p>
          </Card>
        </section>

        {activeId && activeExercise ? (
          <section>
            <SectionHeader title="Exercise progress" />
            <Card className="p-3.5">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex w-full items-center gap-3 text-left"
              >
                <ExerciseThumb exercise={activeExercise} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">{activeExercise.name}</span>
                  <span className="block text-[12px] text-muted">
                    {activeTotals ? pluralize(activeTotals.timesPerformed, 'session') : ''} ·{' '}
                    {activeExercise.primaryMuscle}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-subtle" />
              </button>

              <div className="mt-3">
                <SegmentedControl<ChartMetric>
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'weight', label: 'Weight' },
                    { value: 'volume', label: 'Volume' },
                    { value: 'oneRm', label: 'Est. 1RM' },
                  ]}
                />
              </div>

              <div className="mt-3">
                <ProgressChart
                  data={chartData}
                  metric={metric}
                  unit={unit}
                  emptyMessage="Log this exercise again to compare sessions."
                />
              </div>

              {activeTotals ? (
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <StatTile
                    label="Heaviest"
                    value={activeTotals.heaviest ? formatWeight(activeTotals.heaviest.weightKg, unit) : '—'}
                    unit={activeTotals.heaviest ? unit : undefined}
                  />
                  <StatTile
                    label="Est. 1RM"
                    value={activeTotals.bestOneRm ? formatWeight(activeTotals.bestOneRm, unit) : '—'}
                    unit={activeTotals.bestOneRm ? unit : undefined}
                    tone="accent"
                  />
                  <StatTile
                    label="Total volume"
                    value={formatVolume(activeTotals.totalVolumeKg, unit)}
                  />
                  <StatTile label="Sets logged" value={String(activeTotals.totalWorkingSets)} />
                </div>
              ) : null}

              {activeTotals?.bestSet ? (
                <p className="mt-3 rounded-xl bg-surface2 px-3 py-2 text-[12px] text-muted">
                  Best set:{' '}
                  <span className="font-semibold text-ink">
                    {formatWeight(activeTotals.bestSet.weightKg, unit)} {unit} × {activeTotals.bestSet.reps}
                  </span>{' '}
                  ({formatWeight(activeTotals.bestSet.oneRm, unit)} {unit} est. 1RM)
                </p>
              ) : null}

              {activeSessions.length > 0 ? (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {[...activeSessions]
                    .reverse()
                    .slice(0, 5)
                    .map((session) => (
                      <li key={session.workoutId} className="flex items-center gap-3 py-2">
                        <span className="w-16 shrink-0 text-[12px] font-semibold text-muted">
                          {formatDate(session.date)}
                        </span>
                        <span className="tabular min-w-0 flex-1 truncate text-[12px] text-muted">
                          {session.sets
                            .slice(0, 3)
                            .map((s) => `${formatWeight(s.weightKg, unit)}×${s.reps}`)
                            .join('  ')}
                          {session.sets.length > 3 ? ' …' : ''}
                        </span>
                        <span className="tabular shrink-0 text-[12px] font-semibold text-ink">
                          {formatVolume(session.volumeKg, unit)}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : null}

              <Button
                variant="ghost"
                block
                className="mt-2"
                onClick={() => navigate(`/exercises/${activeId}`)}
              >
                Full exercise detail
                <ChevronRight className="size-4" />
              </Button>
            </Card>
          </section>
        ) : null}

        {records.length > 0 ? (
          <section>
            <SectionHeader title="Personal records" />
            <Card className="divide-y divide-line">
              {records.map(({ exerciseId, pr }) => (
                <button
                  key={exerciseId}
                  type="button"
                  onClick={() => navigate(`/exercises/${exerciseId}`)}
                  className="flex w-full items-center gap-3 p-3 text-left active:bg-surface2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-prsoft text-pr">
                    <Trophy className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {exerciseMap[exerciseId]?.name ?? 'Exercise'}
                    </span>
                    <span className="block text-[11.5px] text-muted">
                      1RM {pr.bestOneRm ? `${formatWeight(pr.bestOneRm.value, unit)} ${unit}` : '—'} ·{' '}
                      {pr.bestVolume ? formatVolume(pr.bestVolume.volumeKg, unit) : '—'} best session
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-right text-sm font-bold text-ink">
                    {pr.heaviest ? `${formatWeight(pr.heaviest.weightKg, unit)} ${unit}` : '—'}
                  </span>
                </button>
              ))}
            </Card>
          </section>
        ) : null}

        <div className={NAV_SPACER} />
      </main>

      <PerformedExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={activeId}
        onSelect={setSelectedId}
      />
    </div>
  )
}
