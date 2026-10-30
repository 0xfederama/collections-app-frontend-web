import type { RefObject } from 'react'
import { Button, Dialog } from '../../components/ui'
import type { Failure } from './form'

const bannerBase = 'flex flex-col gap-3 rounded-lg border p-3 text-ui'

/** The save failure banners at the top of the settings form (UI_SPEC §9). Presentational only. */
export function SettingsBanners({
  failure,
  otherErrors,
  reloadFailed,
  isPending,
  onCopyDraft,
  onReload,
  onRetry,
}: {
  failure: Failure | null
  otherErrors: string[]
  reloadFailed: boolean
  isPending: boolean
  onCopyDraft: () => void
  onReload: () => void
  onRetry: () => void
}) {
  return (
    <div role="group" aria-label="Messages" className="flex flex-col gap-4 empty:hidden">
      {failure?.kind === 'conflict' && (
        <div
          role="alert"
          className={`${bannerBase} border-warning-border bg-warning-bg text-warning-text`}
        >
          <p>
            Someone else changed the settings while you were editing. Your changes have not been
            saved.
          </p>
          {reloadFailed && <p>The latest settings could not be loaded. Try again.</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onCopyDraft}>
              Copy my draft
            </Button>
            <Button size="sm" variant="secondary" onClick={onReload}>
              Reload latest
            </Button>
          </div>
        </div>
      )}
      {failure?.kind === 'network' && (
        <div
          role="alert"
          className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
        >
          <p>
            The server could not be reached. Nothing was saved, and your changes are still here.
          </p>
          <div>
            <Button size="sm" variant="secondary" onClick={onRetry} pending={isPending}>
              Retry
            </Button>
          </div>
        </div>
      )}
      {failure?.kind === 'other' && (
        <div
          role="alert"
          className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
        >
          <p>{failure.message}</p>
        </div>
      )}
      {otherErrors.length > 0 && (
        <div
          role="alert"
          className={`${bannerBase} border-danger-border bg-danger-bg text-danger-text`}
        >
          <p>Some details need attention:</p>
          <ul className="list-disc pl-5">
            {otherErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** The fallback when the browser would not copy the draft: the text is shown to select and copy. */
export function CopyDraftDialog({
  copyFallback,
  copyRef,
  onClose,
}: {
  copyFallback: string | null
  copyRef: RefObject<HTMLTextAreaElement | null>
  onClose: () => void
}) {
  if (copyFallback === null) return null
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Copy your draft"
      description="Your browser would not copy it for you. Select the text below and copy it."
      initialFocus={copyRef}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <textarea
        ref={copyRef}
        readOnly
        aria-label="Your draft"
        rows={6}
        value={copyFallback}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-md border border-border-strong bg-surface p-3 font-mono text-ui text-text"
      />
    </Dialog>
  )
}
