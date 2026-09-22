import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export interface NumberFieldProps {
  value: number
  onChange: (value: number) => void
  label: string
  /** Reps are whole numbers; weights accept one decimal (2.5 kg jumps). */
  step?: number
  integer?: boolean
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  onFocused?: (focused: boolean) => void
}

/**
 * Inline numeric field built for gym logging.
 *
 *  - Tapping selects the whole value, so typing replaces it in one gesture.
 *  - Every keystroke commits immediately, which means the value is already
 *    correct if the user taps ✓ straight after typing (no blur race).
 *  - A zero renders as an empty field, so it reads as "not logged yet".
 */
export function NumberField({
  value,
  onChange,
  label,
  integer = false,
  placeholder = '—',
  className,
  inputClassName,
  disabled,
  onFocused,
}: NumberFieldProps) {
  const [text, setText] = useState(() => (value ? String(value) : ''))
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return
    setText(value ? String(value) : '')
  }, [value])

  const commit = (raw: string) => {
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
    setText(normalized)
    if (normalized === '' || normalized === '.') {
      onChange(0)
      return
    }
    const parsed = Number(normalized)
    onChange(Number.isFinite(parsed) ? (integer ? Math.round(parsed) : parsed) : 0)
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      enterKeyHint="done"
      aria-label={label}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true
        e.currentTarget.select()
        onFocused?.(true)
      }}
      onBlur={() => {
        focused.current = false
        onFocused?.(false)
        if (text === '' || text === '.') onChange(0)
      }}
      onChange={(e) => commit(e.target.value)}
      className={cn(
        'tabular h-11 w-full min-w-0 rounded-xl border border-line bg-surface2 px-2 text-center text-[15px] font-semibold',
        'placeholder:font-normal placeholder:text-subtle',
        'focus:border-accent focus:bg-surface focus:outline-none',
        disabled && 'opacity-60',
        className,
        inputClassName,
      )}
    />
  )
}

export interface StepperProps {
  value: number
  onChange: (value: number) => void
  step: number
  min?: number
  max?: number
  label: string
  format?: (value: number) => string
  integer?: boolean
  className?: string
}

/**
 * +/- stepper so a weight or rep can be adjusted with zero typing — the
 * fastest possible interaction mid-set.
 */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 100000,
  label,
  format,
  integer,
  className,
}: StepperProps) {
  const clamp = (v: number) => {
    const bounded = Math.min(max, Math.max(min, v))
    return integer ? Math.round(bounded) : Math.round(bounded * 100) / 100
  }
  const buttonClass =
    'flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink text-base font-bold active:bg-surface2 disabled:opacity-40'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className={buttonClass}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <span className="tabular min-w-12 text-center text-sm font-semibold text-ink">
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className={buttonClass}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  )
}
