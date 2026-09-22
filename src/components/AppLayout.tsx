import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'
import { RestTimerAlert } from '../hooks/useTimers'

/** Shared phone-width frame for every screen. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">{children}</div>
    </div>
  )
}

/** Standard layout: content plus the four-tab bottom navigation. */
export function AppLayout() {
  return (
    <Frame>
      <RestTimerAlert />
      <Outlet />
      <BottomNavigation />
    </Frame>
  )
}

/** Focused layout for the active workout and the post-workout summary. */
export function FocusLayout() {
  return (
    <Frame>
      <RestTimerAlert />
      <Outlet />
    </Frame>
  )
}

/** Vertical space reserved for the fixed bottom navigation. */
export const NAV_SPACER = 'h-[calc(64px+env(safe-area-inset-bottom,0px))]'
