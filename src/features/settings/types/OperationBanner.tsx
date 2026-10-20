import { Button } from '../../../components/ui'
import { errorText } from './model'

export function OperationBanner({
  error,
  conflict,
  onReload,
  onDismiss,
}: {
  error: unknown
  conflict: boolean
  onReload: () => void
  onDismiss: () => void
}) {
  return (
    <div
      role="alert"
      className="fixed inset-x-6 bottom-6 z-[60] mx-auto max-w-lg rounded-lg border border-warning-border bg-warning-bg p-4 text-sm text-warning-text shadow-float"
    >
      <p>{errorText(error)}</p>
      {conflict && (
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => void onReload()}>
          Reload latest
        </Button>
      )}
      {!conflict && (
        <Button size="sm" variant="secondary" className="mt-2" onClick={onDismiss}>
          Dismiss
        </Button>
      )}
    </div>
  )
}
