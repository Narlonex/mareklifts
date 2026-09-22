import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout, FocusLayout } from './components/AppLayout'
import { ScreenFallback } from './components/ScreenFallback'
import { HomeScreen } from './screens/HomeScreen'
import { WorkoutScreen } from './screens/WorkoutScreen'
import { ActiveWorkoutScreen } from './screens/ActiveWorkoutScreen'
import { WorkoutSummaryScreen } from './screens/WorkoutSummaryScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HistoryDetailScreen } from './screens/HistoryDetailScreen'
import { RoutineEditorScreen } from './screens/RoutineEditorScreen'
import { useApplyTheme } from './hooks/useTheme'

/**
 * The chart screens pull in the charting library, so they are split out of the
 * main bundle — logging a set should never wait on graph code.
 */
const ProgressScreen = lazy(() =>
  import('./screens/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
)
const ExerciseDetailScreen = lazy(() =>
  import('./screens/ExerciseDetailScreen').then((m) => ({ default: m.ExerciseDetailScreen })),
)

/** Long logs need to start at the top of each screen. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export function App() {
  useApplyTheme()

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/workout" element={<WorkoutScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/history/:id" element={<HistoryDetailScreen />} />
            <Route path="/exercises/:id" element={<ExerciseDetailScreen />} />
            <Route path="/routines/new" element={<RoutineEditorScreen />} />
            <Route path="/routines/:id" element={<RoutineEditorScreen />} />
          </Route>

          {/* Focused screens: no bottom navigation while logging. */}
          <Route element={<FocusLayout />}>
            <Route path="/workout/active" element={<ActiveWorkoutScreen />} />
            <Route path="/workout/summary/:id" element={<WorkoutSummaryScreen />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
