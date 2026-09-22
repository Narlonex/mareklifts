import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Play, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { WorkoutSummaryView } from '../components/WorkoutSummaryView'
import { Button, IconButton } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { NAV_SPACER } from '../components/AppLayout'
import { useAppStore } from '../store/useAppStore'
import { formatDateTime } from '../lib/format'

export function HistoryDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const unit = useAppStore((s) => s.user.unit)
  const workout = useAppStore((s) => s.history.find((w) => w.id === id))
  const deleteHistoryEntry = useAppStore((s) => s.deleteHistoryEntry)
  const repeatWorkout = useAppStore((s) => s.repeatWorkout)
  const activeWorkout = useAppStore((s) => s.activeWorkout)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)

  if (!workout) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="Workout" back />
        <div className="px-3 py-4">
          <EmptyState title="Workout not found" message="It may have been deleted." />
        </div>
      </div>
    )
  }

  const startRepeat = () => {
    const newId = repeatWorkout(workout.id)
    if (newId) navigate('/workout/active')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title={workout.name}
        subtitle={formatDateTime(workout.startedAt)}
        back="/history"
        right={
          <IconButton label="Delete workout" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-5" />
          </IconButton>
        }
      />

      <main className="flex-1 space-y-5 px-3 py-3">
        <WorkoutSummaryView workout={workout} unit={unit} />

        <div className="space-y-2">
          <Button
            block
            size="lg"
            onClick={() => {
              if (activeWorkout) setReplaceOpen(true)
              else startRepeat()
            }}
          >
            <Play className="size-4" />
            Repeat this workout
          </Button>
          <p className="px-1 text-center text-[12px] text-subtle">
            Starts a new session with these exercises and weights pre-filled.
          </p>
        </div>

        <div className={NAV_SPACER} />
      </main>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this workout?"
        message="It will be removed from history, and your statistics and records will update accordingly."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteHistoryEntry(workout.id)
          setDeleteOpen(false)
          navigate('/history', { replace: true })
        }}
      />

      <ConfirmDialog
        open={replaceOpen}
        title="Unfinished workout"
        message="You already have a workout in progress. Starting a new one will discard the sets you've logged so far."
        confirmLabel="Discard & start"
        destructive
        onCancel={() => setReplaceOpen(false)}
        onConfirm={() => {
          useAppStore.getState().cancelActiveWorkout()
          setReplaceOpen(false)
          startRepeat()
        }}
      />
    </div>
  )
}
