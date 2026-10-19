/** Shown while a book item is created: the server fills it from Open Library before it answers. */
export function LookupStatus() {
  return (
    <p role="status" aria-live="polite" className="text-sm text-text-muted">
      Looking up details on Open Library… this can take a few seconds.
    </p>
  )
}
