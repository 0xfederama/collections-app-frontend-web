import { Button } from '../../components/ui'
import type { TreeError } from './errors'

/**
 * The error area of a dialog (role=alert). A 412 offers "Reload latest" (no auto-merge); a
 * network or server failure offers "Retry" and says plainly that the input was kept.
 */
export function FormError({
  error,
  pending,
  onReload,
  onRetry,
}: {
  error: TreeError
  pending?: boolean
  onReload?: () => void
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-lg border border-danger-border bg-danger-bg p-3 text-ui text-danger-text"
    >
      <p>{error.message}</p>
      {error.kind === 'conflict' && onReload && (
        <Button size="sm" variant="secondary" onClick={onReload} disabled={pending}>
          Reload latest
        </Button>
      )}
      {error.kind === 'network' && onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} disabled={pending}>
          Retry
        </Button>
      )}
    </div>
  )
}
