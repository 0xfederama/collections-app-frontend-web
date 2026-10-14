import { cx } from '../../lib/cx'
import { useBackendStatus, type BackendStatus as Status } from './api'

const dotClasses: Record<Status, string> = {
  checking: 'bg-warning-text',
  ready: 'bg-success-text',
  down: 'bg-danger-text',
}

/** Small readiness indicator. The text is always present (hidden visually in `dotOnly`), so the state is never colour-only. */
export function BackendStatus({ dotOnly = false }: { dotOnly?: boolean }) {
  const status = useBackendStatus()
  return (
    <span
      aria-live="polite"
      title={`Backend: ${status}`}
      className="inline-flex items-center gap-2 text-xs text-text-muted"
    >
      <span aria-hidden className={cx('size-2 shrink-0 rounded-full', dotClasses[status])} />
      <span className={dotOnly ? 'sr-only' : undefined}>Backend: {status}</span>
    </span>
  )
}
