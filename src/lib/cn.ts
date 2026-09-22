export type ClassValue = string | number | false | null | undefined

/** Minimal classnames helper — no dependency needed. */
export function cn(...values: ClassValue[]): string {
  let out = ''
  for (const v of values) {
    if (!v) continue
    out = out ? `${out} ${v}` : String(v)
  }
  return out
}
