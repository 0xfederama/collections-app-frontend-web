import { Button } from '../../components/ui'
import type { TrashError } from './errors'

/** An inline error (role=alert). Network and server failures offer Retry and say nothing changed. */
export function TrashErrorMessage({
  error,
  onRetry,
  pending,
}: {
  error: TrashError
  onRetry?: () => void
  pending?: boolean
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-lg border border-danger-border bg-danger-bg p-3 text-ui text-danger-text"
    >
      <p>{error.message}</p>
      {error.kind === 'network' && onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} disabled={pending}>
          Retry
        </Button>
      )}
    </div>
  )
}
