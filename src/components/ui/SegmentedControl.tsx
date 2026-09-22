import { cn } from '../../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex w-full gap-1 rounded-2xl border border-line bg-surface2 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-xl font-semibold transition-colors',
              size === 'sm' ? 'h-9 text-[13px]' : 'h-11 text-sm',
              active ? 'bg-surface text-ink shadow-card' : 'text-muted active:bg-surface',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
