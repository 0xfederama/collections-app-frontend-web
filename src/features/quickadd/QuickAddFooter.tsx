import { Button } from '../../components/ui'
import { LookupStatus } from '../items'

interface QuickAddStatusProps {
  /** The book lookup is running (the create request is pending for a book list). */
  lookupPending: boolean
  lookupUnavailable: boolean
  sourceName: string
  formError: string | undefined
  onRetryLookup: () => void
  onAddWithoutLookup: () => void
}

/** The lookup progress line, then the lookup-unavailable choice or the form error. */
export function QuickAddStatus({
  lookupPending,
  lookupUnavailable,
  sourceName,
  formError,
  onRetryLookup,
  onAddWithoutLookup,
}: QuickAddStatusProps) {
  return (
    <>
      {lookupPending && <LookupStatus />}
      {lookupUnavailable ? (
        <div
          role="alert"
          className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
        >
          <p>
            {sourceName} metadata is unavailable right now. Your title is still here; retry the
            lookup or add it without {sourceName} metadata.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onRetryLookup}>
              Retry {sourceName} lookup
            </Button>
            <Button size="sm" variant="secondary" onClick={onAddWithoutLookup}>
              Add without {sourceName} metadata
            </Button>
          </div>
        </div>
      ) : (
        formError && (
          <div
            role="alert"
            className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
          >
            {formError}
          </div>
        )
      )}
    </>
  )
}

interface QuickAddFooterProps {
  busy: boolean
  onCancel: () => void
}

/** The keyboard hint and the Cancel / Add buttons at the bottom of the form. */
export function QuickAddFooter({ busy, onCancel }: QuickAddFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <p className="text-xs text-text-muted max-sm:hidden [@media(hover:none)]:hidden">
        Enter to add · Esc to cancel
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" pending={busy}>
          Add
        </Button>
      </div>
    </div>
  )
}
