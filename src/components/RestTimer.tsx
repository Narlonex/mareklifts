import { Pause, Play, SkipForward, Timer } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button, IconButton } from './ui/Button'
import { cn } from '../lib/cn'
import { formatCountdown } from '../lib/format'
import { haptics } from '../lib/feedback'
import { REST_PRESETS } from '../lib/stats'
import { useRestRemaining } from '../hooks/useTimers'
import { useAppStore } from '../store/useAppStore'

/** Header chip: shows the live countdown and opens the full timer. */
export function RestTimerChip({ onClick }: { onClick: () => void }) {
  const remaining = useRestRemaining()
  const running = remaining !== null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={running ? `Rest timer ${formatCountdown(remaining)} remaining` : 'Rest timer'}
      className={cn(
        'flex h-11 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold transition-colors',
        running
          ? 'border-accent/40 bg-accentsoft text-accent'
          : 'border-line bg-surface text-muted active:bg-surface2',
      )}
    >
      <Timer className="size-4" />
      <span className="tabular">{running ? formatCountdown(remaining) : 'Rest'}</span>
    </button>
  )
}

/** Sticky countdown bar shown while a rest timer is running. */
export function RestTimerBar({ onExpand }: { onExpand: () => void }) {
  const restTimer = useAppStore((s) => s.restTimer)
  const addRestTime = useAppStore((s) => s.addRestTime)
  const skipRest = useAppStore((s) => s.skipRest)
  const remaining = useRestRemaining()

  if (!restTimer || remaining === null) return null

  const total = Math.max(1, restTimer.totalSeconds * 1000)
  const progress = Math.max(0, Math.min(1, remaining / total))
  const finished = remaining <= 0

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface/97 pb-safe backdrop-blur-lg">
      <div className="h-1 w-full bg-surface2">
        <div
          className={cn('h-full transition-[width] duration-300 ease-linear', finished ? 'bg-success' : 'bg-accent')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label="Open rest timer"
        >
          <Timer className={cn('size-5 shrink-0', finished ? 'text-success' : 'text-accent')} />
          <span className="min-w-0">
            <span className="tabular block text-xl leading-none font-bold text-ink">
              {finished ? 'Rest complete' : formatCountdown(remaining)}
            </span>
            <span className="block text-[11px] text-muted">
              {finished ? 'Time for the next set' : 'Tap to adjust'}
            </span>
          </span>
        </button>
        <Button
          variant="subtle"
          size="sm"
          className="border border-line"
          onClick={() => {
            haptics.tap()
            addRestTime(15)
          }}
        >
          +15s
        </Button>
        <IconButton label="Skip rest" variant="subtle" onClick={skipRest}>
          <SkipForward className="size-5" />
        </IconButton>
      </div>
    </div>
  )
}

/** Full timer: presets, fine adjustment, pause/resume. */
export function RestTimerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const restTimer = useAppStore((s) => s.restTimer)
  const startRest = useAppStore((s) => s.startRest)
  const addRestTime = useAppStore((s) => s.addRestTime)
  const pauseRest = useAppStore((s) => s.pauseRest)
  const resumeRest = useAppStore((s) => s.resumeRest)
  const skipRest = useAppStore((s) => s.skipRest)
  const defaultRestSeconds = useAppStore((s) => s.user.defaultRestSeconds)
  const updateUser = useAppStore((s) => s.updateUser)
  const remaining = useRestRemaining()

  const running = restTimer !== null && remaining !== null
  const paused = restTimer?.pausedRemainingMs !== null && restTimer?.pausedRemainingMs !== undefined
  const total = Math.max(1, (restTimer?.totalSeconds ?? defaultRestSeconds) * 1000)
  const progress = running ? Math.max(0, Math.min(1, remaining / total)) : 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rest timer"
      subtitle={`Default ${formatCountdown(defaultRestSeconds * 1000)}`}
    >
      <div className="flex flex-col items-center py-2">
        <div className="relative flex size-40 items-center justify-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" className="stroke-line" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress)}`}
              className={cn('transition-[stroke-dashoffset] duration-300 ease-linear', running ? 'stroke-accent' : 'stroke-linestrong')}
            />
          </svg>
          <div className="text-center">
            <div className="tabular text-4xl leading-none font-bold text-ink">
              {running ? formatCountdown(remaining) : formatCountdown(defaultRestSeconds * 1000)}
            </div>
            <div className="mt-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
              {running ? (paused ? 'Paused' : remaining <= 0 ? 'Complete' : 'Resting') : 'Ready'}
            </div>
          </div>
        </div>

        <div className="mt-3 grid w-full grid-cols-4 gap-2">
          {REST_PRESETS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => startRest(seconds)}
              className={cn(
                'h-12 rounded-2xl border text-sm font-bold transition-colors',
                restTimer?.totalSeconds === seconds
                  ? 'border-accent bg-accentsoft text-accent'
                  : 'border-line bg-surface text-ink active:bg-surface2',
              )}
            >
              {seconds}s
            </button>
          ))}
        </div>

        <div className="mt-2 grid w-full grid-cols-3 gap-2">
          <Button variant="secondary" onClick={() => addRestTime(-15)} disabled={!running}>
            −15s
          </Button>
          <Button variant="secondary" onClick={() => addRestTime(15)} disabled={!running}>
            +15s
          </Button>
          <Button variant="secondary" onClick={running ? (paused ? resumeRest : pauseRest) : () => startRest()}>
            {running ? (
              paused ? (
                <>
                  <Play className="size-4" /> Resume
                </>
              ) : (
                <>
                  <Pause className="size-4" /> Pause
                </>
              )
            ) : (
              <>
                <Play className="size-4" /> Start
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex w-full gap-2">
          <Button variant="ghost" block onClick={skipRest} disabled={!running}>
            <SkipForward className="size-4" />
            Stop timer
          </Button>
        </div>

        <button
          type="button"
          onClick={() => updateUser({ defaultRestSeconds: restTimer?.totalSeconds || defaultRestSeconds })}
          disabled={!running}
          className="mt-2 text-[12px] font-semibold text-accent disabled:text-subtle"
        >
          Save {formatCountdown((restTimer?.totalSeconds ?? defaultRestSeconds) * 1000)} as default
        </button>
      </div>
    </Sheet>
  )
}
