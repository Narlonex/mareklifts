/** Shown while a lazily-loaded screen (and its chart library) downloads. */
export function ScreenFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-live="polite">
      <span className="size-7 animate-spin rounded-full border-2 border-line border-t-accent" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
