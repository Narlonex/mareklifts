# MarekLifts

A mobile-first, offline-first gym workout tracker. Built around one idea: **logging a
set should take one tap**.

Local-only by design — no account, no backend, no cloud. Everything lives in the
browser and survives closing the app, killing the tab, or a phone dying mid-session.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 72 unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build + service worker
npm run preview    # serve the production build
```

## The fast-logging loop

This is the part everything else is arranged around:

1. Tap **Start Routine** (one tap from Home or the Workout tab).
2. Every set is **pre-filled from your last session of that exercise** — weight *and* reps.
3. Tap **✓**. One tap per set. The rest timer starts on its own.
4. **Finish Workout** → saved to history → stats and PRs update.

Supporting details that make it hold up in an actual gym:

- The **Previous** column shows the same set index from last time, so you know what
  you're chasing without leaving the screen.
- Weight and reps are inline-editable, plus **± steppers** (2.5 kg / 1 rep) so nothing
  requires a keyboard if you don't want one.
- Tapping the set badge opens set options (Warm-up / Working / Failure, or delete).
- **Add Set** carries the last set's values forward, ready to tap.
- The rest timer is a **wall-clock `endsAt`**, so it stays accurate when the app is
  backgrounded or closed and reopened. Beeps + vibrates when it finishes.
- The screen wake lock is held during a workout so the display doesn't sleep mid-set.
- **An in-progress workout is persisted on every mutation.** Reopening the app drops you
  back into it, including the rest countdown.
- Starting a new workout while one is open asks first — nothing is ever silently lost.

## Features

**Workout** — Start Empty Workout, saved routines (Push / Pull / Legs / Full Body seeded),
recent workouts, routine creation and editing with reorder, target sets, and notes.

**Logging** — per-exercise cards with a `Set | Prev | Weight | Reps | ✓` table, warm-up
and failure set types, add/delete/reorder exercises, replace exercise, per-exercise and
per-workout notes, live duration / volume / set count.

**Routines** — create, rename, add/remove/reorder exercises, notes, duplicate, delete.
Starting a routine materialises a fresh workout with last-session values pre-filled.

**History** — grouped by week with per-week totals, searchable by workout or exercise
name, and a detail view that renders the exact logged sets. "Repeat this workout" starts
a new session from a past one.

**Progress** — time window (7 / 30 / 90 days / all time), working sets per muscle group,
12-week volume bar chart, and per-exercise charts for **Weight**, **Volume** and
**estimated 1RM** with heaviest / best set / total volume / sets logged. Exercise detail
pages show records and full session history.

**Personal records** — detected automatically across four categories: heaviest weight,
best reps at a weight, estimated 1RM (Epley), and best single-session volume. New records
surface live as a toast during a workout, in the finish summary, and as badges in history.

**Profile** — name, body weight, height, kg/lb toggle, light/dark/system theme, default
rest time with auto-start toggle, lifetime stats and training frequency, all records, and
JSON export/restore. **Load sample history** fills 8 weeks of realistic training so the
charts and PRs are demonstrable immediately.

## How it's built

```
src/
  types/            domain model (User, Exercise, Routine, Workout, WorkoutExercise, Set)
  data/             seed exercise database (77 exercises) + sample history generator
  lib/              stats & PR engine, units, formatting, haptics/audio, ids
  store/            zustand store (persisted) + derived-data selectors
  hooks/            theme, workout clock, rest countdown
  components/       ExerciseCard, SetRow, RestTimer, RoutineCard, WorkoutSummaryView,
                    ProgressChart, ExerciseSelector, BottomNavigation, + ui primitives
  screens/          Home, Workout, ActiveWorkout, WorkoutSummary, History, HistoryDetail,
                    Progress, ExerciseDetail, RoutineEditor, Profile
```

Deliberate decisions worth knowing:

- **All weights are stored in kilograms.** The kg/lb preference only affects display and
  input, so switching units never rewrites history. (77.5 kg round-trips as an exact
  170.9 lb.)
- **Statistics and PRs are never stored** — they are folded out of `history` by
  `lib/stats.ts`. History and Progress therefore cannot disagree, and deleting a workout
  correctly updates records. PRs achieved are cached onto a saved workout only for cheap
  history rendering.
- **Warm-up sets are excluded** from volume, working-set counts, muscle-group statistics
  and PR detection. The UI states this rather than hiding it.
- **The workout clock counts foreground time only** and banks seconds every 5s, so a phone
  in a pocket doesn't inflate a session's duration.
- **Charting is code-split.** The screens that need it are lazy routes, keeping the
  logging flow's bundle small.
- A muscle group is credited from the exercise's **primary** muscle, so the totals sum
  exactly to the logged working sets.
- Everything is isolated behind `src/store`, so an auth/cloud-sync layer can be added
  later without touching the UI.

## Tests

`npm test` — 72 tests over the parts most likely to be silently wrong:

- set-counting rules (warm-up exclusion, incomplete sets, failure sets)
- Epley 1RM and best-set selection
- previous-performance lookup, including exclusion and empty history
- all four PR categories, plus "an identical repeat session produces no PRs"
- muscle-group attribution, time windows and deterministic ordering
- weekly bucketing, lifetime totals, streaks
- kg↔lb round-tripping at display precision
- the full store flow: prefill, one-tap completion, PR detection on completion, warm-up
  exclusion, set/exercise add-update-delete-reorder, finish (totals, duration, PRs),
  history deletion, export/import, and **rehydration of an in-progress workout**

## Scope

Implemented: workout logging, routines, history, progress, PRs, profile.

Intentionally not included (per the MVP brief): social feed, following, messaging, public
profiles, coaching, AI workout generation, nutrition, wearables, payments, subscriptions,
and any cloud infrastructure.

## Notes

- No third-party branding, logos, assets or copy — the name, icons, exercise cues and
  UI are original. Exercise "demonstration images" are generated monogram tiles tinted by
  muscle group rather than photographic assets.
- Icons are generated by `node scripts/generate-icons.mjs` (a dependency-free PNG
  encoder), so no binary assets are hand-managed.
