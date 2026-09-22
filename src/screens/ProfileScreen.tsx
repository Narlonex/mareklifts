import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  Flame,
  Ruler,
  Scale,
  Timer,
  Trash2,
  Trophy,
  Upload,
  User as UserIcon,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button, IconButton } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { KeyValueRow, StatTile } from '../components/ui/StatTile'
import { Sheet } from '../components/ui/Sheet'
import { NumberField } from '../components/ui/NumberField'
import { NAV_SPACER } from '../components/AppLayout'
import { useAppStore } from '../store/useAppStore'
import { useExerciseMap, useHistory, useHistoryTotals, useRankedExercises } from '../store/selectors'
import { formatDuration, formatVolume, pluralize } from '../lib/format'
import { cmToFeetInches, formatWeight, fromDisplayWeight, toDisplayWeight } from '../lib/units'
import { REST_PRESETS, prForExercise, weeklyStats } from '../lib/stats'
import type { ThemePreference, Unit } from '../types'

export function ProfileScreen() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const updateUser = useAppStore((s) => s.updateUser)
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const loadSampleData = useAppStore((s) => s.loadSampleData)
  const clearHistory = useAppStore((s) => s.clearHistory)
  const resetAll = useAppStore((s) => s.resetAll)

  const history = useHistory()
  const totals = useHistoryTotals()
  const ranked = useRankedExercises()
  const exerciseMap = useExerciseMap()

  const [weightOpen, setWeightOpen] = useState(false)
  const [heightOpen, setHeightOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [confirm, setConfirm] = useState<'clear' | 'reset' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [draftName, setDraftName] = useState(user.name)
  const [draftWeight, setDraftWeight] = useState(toDisplayWeight(user.bodyWeightKg ?? 0, user.unit))
  const [draftHeight, setDraftHeight] = useState(user.heightCm ?? 170)

  const thisWeek = useMemo(() => weeklyStats(history, 1)[0], [history])

  const records = useMemo(
    () =>
      ranked
        .map(({ exerciseId }) => ({ exerciseId, pr: prForExercise(history, exerciseId) }))
        .filter((r) => r.pr.heaviest !== null),
    [ranked, history],
  )

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const handleExport = () => {
    try {
      const blob = new Blob([exportData()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mareklifts-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      notify('Backup downloaded')
    } catch {
      notify('Could not create the backup file')
    }
  }

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    const result = importData(text)
    notify(result.ok ? 'Backup restored' : (result.error ?? 'Import failed'))
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader large title="Profile" subtitle="Your body, preferences and records" />

      <main className="flex-1 space-y-5 px-3 pt-3">
        <Card className="p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accentsoft text-accent">
              <UserIcon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold text-ink">{user.name || 'Add your name'}</p>
              <p className="text-[12px] text-muted">
                {totals.firstWorkoutAt
                  ? `Training with MarekLifts since ${new Date(totals.firstWorkoutAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
                  : 'No workouts logged yet'}
              </p>
            </div>
            <IconButton
              label="Edit name"
              onClick={() => {
                setDraftName(user.name)
                setNameOpen(true)
              }}
            >
              <ChevronRight className="size-5" />
            </IconButton>
          </div>
        </Card>

        <section>
          <SectionHeader title="Body" />
          <Card className="px-3.5 py-1 divide-y divide-line">
            <button type="button" className="flex w-full items-center gap-3 py-2 text-left" onClick={() => {
              setDraftWeight(toDisplayWeight(user.bodyWeightKg ?? 0, user.unit))
              setWeightOpen(true)
            }}>
              <Scale className="size-4 shrink-0 text-muted" />
              <span className="flex-1 text-sm text-muted">Body weight</span>
              <span className="tabular text-sm font-semibold text-ink">
                {user.bodyWeightKg !== null ? `${formatWeight(user.bodyWeightKg, user.unit)} ${user.unit}` : 'Set'}
              </span>
              <ChevronRight className="size-4 shrink-0 text-subtle" />
            </button>
            <button type="button" className="flex w-full items-center gap-3 py-2 text-left" onClick={() => {
              setDraftHeight(user.heightCm ?? 170)
              setHeightOpen(true)
            }}>
              <Ruler className="size-4 shrink-0 text-muted" />
              <span className="flex-1 text-sm text-muted">Height</span>
              <span className="tabular text-sm font-semibold text-ink">
                {user.heightCm !== null
                  ? `${user.heightCm} cm · ${cmToFeetInches(user.heightCm).feet}'${cmToFeetInches(user.heightCm).inches}"`
                  : 'Set'}
              </span>
              <ChevronRight className="size-4 shrink-0 text-subtle" />
            </button>
          </Card>
        </section>

        <section>
          <SectionHeader title="Lifetime stats" />
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="Workouts" value={String(totals.workouts)} icon={<Flame className="size-3.5" />} />
            <StatTile label="Working sets" value={String(totals.workingSets)} />
            <StatTile label="Total volume" value={formatVolume(totals.volumeKg, user.unit)} tone="accent" />
            <StatTile label="Time trained" value={formatDuration(totals.durationSec)} />
          </div>
          <Card className="mt-2.5 px-3.5 py-1">
            <KeyValueRow label="Training frequency" value={`${totals.perWeek} days / week`} />
            <KeyValueRow label="Active days" value={String(totals.activeDays)} />
            <KeyValueRow label="Longest streak" value={pluralize(totals.longestStreakDays, 'day')} />
            <KeyValueRow label="This week" value={`${pluralize(thisWeek?.workouts ?? 0, 'workout')}`} />
          </Card>
        </section>

        <section>
          <SectionHeader
            title="Personal records"
            action={
              records.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setRecordsOpen(true)}
                  className="text-[13px] font-bold text-accent"
                >
                  View all
                </button>
              ) : null
            }
          />
          {records.length === 0 ? (
            <Card className="p-3.5 text-[13px] text-muted">
              Complete some working sets and your records will be tracked automatically.
            </Card>
          ) : (
            <Card className="divide-y divide-line">
              {records.slice(0, 4).map(({ exerciseId, pr }) => (
                <div key={exerciseId} className="flex items-center gap-3 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-prsoft text-pr">
                    <Trophy className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {exerciseMap[exerciseId]?.name ?? 'Exercise'}
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold text-ink">
                    {pr.heaviest ? `${formatWeight(pr.heaviest.weightKg, user.unit)} ${user.unit} × ${pr.heaviest.reps}` : '—'}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section>
          <SectionHeader title="Preferences" />
          <Card className="space-y-3.5 p-3.5">
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-muted">Appearance</p>
              <SegmentedControl<ThemePreference>
                size="sm"
                value={user.theme}
                onChange={(theme) => updateUser({ theme })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-muted">Weight unit</p>
              <SegmentedControl<Unit>
                size="sm"
                value={user.unit}
                onChange={(unit) => updateUser({ unit })}
                options={[
                  { value: 'kg', label: 'Kilograms' },
                  { value: 'lb', label: 'Pounds' },
                ]}
              />
              <p className="mt-1.5 text-[11.5px] text-subtle">
                Existing workouts are stored in kilograms and converted for display, so switching never changes
                your logged numbers.
              </p>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Timer className="size-3.5" />
                Default rest timer
              </p>
              <div className="grid grid-cols-4 gap-2">
                {REST_PRESETS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => updateUser({ defaultRestSeconds: seconds })}
                    className={
                      user.defaultRestSeconds === seconds
                        ? 'h-11 rounded-xl border border-accent bg-accentsoft text-sm font-bold text-accent'
                        : 'h-11 rounded-xl border border-line bg-surface text-sm font-bold text-ink active:bg-surface2'
                    }
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
              <label className="mt-2.5 flex min-h-11 items-center justify-between gap-3">
                <span className="text-[13px] text-muted">Start rest timer when a set is completed</span>
                <input
                  type="checkbox"
                  checked={user.autoStartRest}
                  onChange={(e) => updateUser({ autoStartRest: e.target.checked })}
                  className="size-6 shrink-0 accent-[var(--app-accent)]"
                />
              </label>
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="Your data" />
          <Card className="space-y-2 p-3.5">
            <p className="text-[12px] text-subtle">
              Everything lives on this device only — no account, no cloud. Export a backup before clearing your
              browser data.
            </p>
            <Button variant="secondary" block onClick={handleExport}>
              <Download className="size-4" />
              Export backup (JSON)
            </Button>
            <Button variant="secondary" block onClick={() => fileInput.current?.click()}>
              <Upload className="size-4" />
              Restore from backup
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="secondary"
              block
              onClick={() => {
                loadSampleData()
                notify('Sample history loaded')
              }}
            >
              Load sample history
            </Button>
            <Button variant="ghost" block onClick={() => setConfirm('clear')} disabled={history.length === 0}>
              <Trash2 className="size-4" />
              Clear workout history
            </Button>
            <Button variant="danger" block onClick={() => setConfirm('reset')}>
              Reset everything
            </Button>
          </Card>
        </section>

        <p className="px-1 pb-2 text-center text-[11px] text-subtle">
          MarekLifts — built for fast logging in the gym.
        </p>

        <div className={NAV_SPACER} />
      </main>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 animate-toast-in rounded-2xl bg-ink px-4 py-3 text-center text-[13px] font-semibold text-canvas">
          {toast}
        </div>
      ) : null}

      <Sheet
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        title="Your name"
        footer={
          <Button
            block
            onClick={() => {
              updateUser({ name: draftName.trim() })
              setNameOpen(false)
            }}
          >
            Save
          </Button>
        }
      >
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          autoFocus
          placeholder="e.g. Marek"
          className="h-12 w-full rounded-2xl border border-line bg-surface2 px-3 text-sm text-ink placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
        />
      </Sheet>

      <Sheet
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        title="Body weight"
        subtitle={`Entered in ${user.unit}`}
        footer={
          <Button
            block
            onClick={() => {
              updateUser({ bodyWeightKg: draftWeight > 0 ? fromDisplayWeight(draftWeight, user.unit) : null })
              setWeightOpen(false)
            }}
          >
            Save body weight
          </Button>
        }
      >
        <div className="flex items-center gap-3">
          <NumberField
            value={draftWeight}
            onChange={setDraftWeight}
            label="Body weight"
            placeholder="0"
            className="h-14 text-lg"
          />
          <span className="text-sm font-bold text-muted">{user.unit}</span>
        </div>
        <p className="mt-2 text-[12px] text-subtle">
          Used for bodyweight-exercise context and to make your volume numbers meaningful over time.
        </p>
      </Sheet>

      <Sheet
        open={heightOpen}
        onClose={() => setHeightOpen(false)}
        title="Height"
        subtitle={`${cmToFeetInches(draftHeight).feet}'${cmToFeetInches(draftHeight).inches}"`}
        footer={
          <Button
            block
            onClick={() => {
              updateUser({ heightCm: draftHeight > 0 ? Math.round(draftHeight) : null })
              setHeightOpen(false)
            }}
          >
            Save height
          </Button>
        }
      >
        <div className="flex items-center gap-3">
          <NumberField
            value={draftHeight}
            onChange={setDraftHeight}
            label="Height in centimetres"
            integer
            placeholder="0"
            className="h-14 text-lg"
          />
          <span className="text-sm font-bold text-muted">cm</span>
        </div>
      </Sheet>

      <Sheet open={recordsOpen} onClose={() => setRecordsOpen(false)} title="All personal records">
        <ul className="divide-y divide-line">
          {records.map(({ exerciseId, pr }) => (
            <li key={exerciseId}>
              <button
                type="button"
                onClick={() => navigate(`/exercises/${exerciseId}`)}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {exerciseMap[exerciseId]?.name ?? 'Exercise'}
                  </span>
                  <span className="block text-[11.5px] text-muted">
                    1RM {pr.bestOneRm ? `${formatWeight(pr.bestOneRm.value, user.unit)} ${user.unit}` : '—'}
                  </span>
                </span>
                <span className="tabular shrink-0 text-sm font-bold text-ink">
                  {pr.heaviest
                    ? `${formatWeight(pr.heaviest.weightKg, user.unit)} ${user.unit} × ${pr.heaviest.reps}`
                    : '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <ConfirmDialog
        open={confirm === 'clear'}
        title="Clear workout history?"
        message="All logged workouts, records and progress charts will be deleted. Routines are kept."
        confirmLabel="Clear history"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          clearHistory()
          setConfirm(null)
          notify('History cleared')
        }}
      />

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Reset everything?"
        message="Workouts, routines, custom exercises and settings will all be removed, and the default routines restored."
        confirmLabel="Reset app"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          resetAll()
          setConfirm(null)
          notify('App reset')
        }}
      />
    </div>
  )
}
