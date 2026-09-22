import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Trophy } from 'lucide-react'
import { WorkoutSummaryView } from '../components/WorkoutSummaryView'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useAppStore } from '../store/useAppStore'
import { formatDate } from '../lib/format'
import { haptics } from '../lib/feedback'

export function WorkoutSummaryScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const unit = useAppStore((s) => s.user.unit)
  const workout = useAppStore((s) => s.history.find((w) => w.id === id))

  useEffect(() => {
    haptics.set()
  }, [])

  if (!workout) {
    return (
      <div className="px-3 py-6">
        <EmptyState
          title="Workout saved"
          message="This summary is no longer available, but the workout is in your history."
          action={
            <Button block onClick={() => navigate('/history')}>
              Open history
            </Button>
          }
        />
      </div>
    )
  }

  const prCount = workout.prsAchieved?.length ?? 0

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-canvas px-4 pt-safe">
        <div className="flex flex-col items-center py-6">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success text-onaccent">
            <Check className="size-8" strokeWidth={3} />
          </span>
          <h1 className="mt-3 text-center text-[22px] leading-tight font-bold text-ink">Workout complete</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {workout.name} · {formatDate(workout.startedAt)}
          </p>
          {prCount > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-prsoft px-3 py-1.5 text-[13px] font-bold text-pr">
              <Trophy className="size-4" />
              {prCount} new personal record{prCount === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
      </header>

      <main className="flex-1 px-3 py-4">
        <WorkoutSummaryView workout={workout} unit={unit} />
      </main>

      <div className="sticky bottom-0 space-y-2 border-t border-line bg-canvas/95 px-3 pt-3 pb-safe backdrop-blur-lg">
        <Button block size="lg" onClick={() => navigate('/workout', { replace: true })}>
          Done
        </Button>
        <Button variant="ghost" block onClick={() => navigate(`/history/${workout.id}`, { replace: true })}>
          View in history
        </Button>
      </div>
    </div>
  )
}
