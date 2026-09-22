import { NavLink } from 'react-router-dom'
import { Dumbbell, House, TrendingUp, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/cn'

const TABS = [
  { to: '/', label: 'Home', icon: House },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/profile', label: 'Profile', icon: User },
] as const

export function BottomNavigation() {
  const hasActiveWorkout = useAppStore((s) => s.activeWorkout !== null)

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface/95 pb-safe backdrop-blur-lg"
    >
      <ul className="flex items-stretch">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-accent' : 'text-muted active:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                    {to === '/workout' && hasActiveWorkout ? (
                      <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-success ring-2 ring-surface" />
                    ) : null}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
