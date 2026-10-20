import type { ReactNode } from 'react'
import { Button } from '../../components/ui'
import { CircleAlert, CircleCheck, LoaderCircle } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import { useBackendCheck, type BackendStatus } from '../health'

const statusView: Record<BackendStatus, { text: string; Icon: typeof CircleCheck; tone: string }> =
  {
    checking: { text: 'Checking…', Icon: LoaderCircle, tone: 'text-text-muted' },
    ready: { text: 'Ready', Icon: CircleCheck, tone: 'text-success-text' },
    down: { text: 'Unreachable', Icon: CircleAlert, tone: 'text-danger-text' },
  }

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-sm text-text-muted sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-all text-sm">{children}</dd>
    </div>
  )
}

/**
 * Connection details (F006-W9): backend status from `/readyz`, the API address (always the page's own
 * origin, D-033), and the contract tag and app version baked in at build time. The backend's internal
 * address is deliberately absent: the browser cannot know it.
 */
export function ConnectionSection() {
  const { status, check } = useBackendCheck()
  const { text, Icon, tone } = statusView[status]
  return (
    <dl className="flex flex-col gap-3">
      <Row label="Backend">
        <span className="flex flex-wrap items-center gap-3">
          {/* Icon + text, never colour alone; `role=status` is a polite live region, so a re-check result is announced. */}
          <span role="status" className={cx('inline-flex items-center gap-1.5', tone)}>
            <Icon aria-hidden className={cx('size-4', status === 'checking' && 'animate-spin')} />
            <span>{text}</span>
          </span>
          <Button variant="secondary" size="sm" onClick={check} disabled={status === 'checking'}>
            Check again
          </Button>
        </span>
      </Row>
      <Row label="API address">
        <code>{`${window.location.origin}/api`}</code>
      </Row>
      <Row label="API contract">
        <code>{__API_CONTRACT_TAG__}</code>
      </Row>
      <Row label="App version">
        <code>{__APP_VERSION__}</code>
      </Row>
    </dl>
  )
}
