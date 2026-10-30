import { useState, type ReactNode } from 'react'
import { Button, useToast } from '../../../components/ui'

const base = 'flex flex-col gap-2 rounded-lg border p-3 text-ui'
const warning = `${base} border-warning-border bg-warning-bg text-warning-text`
const danger = `${base} border-danger-border bg-danger-bg text-danger-text`

/** Copies `text`; when the browser refuses, the text is shown to select and copy by hand. */
function useCopy(text?: () => string) {
  const toast = useToast()
  const [fallback, setFallback] = useState<string | null>(null)
  const copy = async () => {
    const value = text?.() ?? ''
    try {
      await navigator.clipboard.writeText(value)
      toast({ kind: 'success', title: 'Draft copied to the clipboard' })
    } catch {
      setFallback(value)
    }
  }
  const fallbackBox = fallback !== null && (
    <textarea
      readOnly
      aria-label="Your draft"
      rows={4}
      value={fallback}
      onFocus={(event) => event.currentTarget.select()}
      className="w-full rounded-md border border-border-strong bg-surface p-2 font-mono text-secondary text-text"
    />
  )
  return { copy, fallbackBox }
}

/**
 * 412 on an in-place save (AT-09): the draft stays where it is. "Copy draft" puts it on the
 * clipboard, "Reload latest" loads the current version and closes the editor (the only way the
 * draft is dropped, and the user asked for it).
 */
export function ConflictBanner({
  message,
  draftText,
  onReload,
  reloading,
  reloadFailed,
}: {
  message: string
  /** The text "Copy draft" puts on the clipboard; no button without it. */
  draftText?: () => string
  onReload: () => void
  reloading: boolean
  reloadFailed: boolean
}) {
  const { copy, fallbackBox } = useCopy(draftText)
  return (
    <div role="alert" className={warning}>
      <p>{message}</p>
      {reloadFailed && <p>The latest version could not be loaded. Try again.</p>}
      <div className="flex flex-wrap gap-2">
        {draftText && (
          <Button size="sm" variant="secondary" onClick={() => void copy()}>
            Copy draft
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onReload} pending={reloading}>
          Reload latest
        </Button>
      </div>
      {fallbackBox}
    </div>
  )
}

/** The item is gone (404): the draft can only be copied. */
export function GoneBanner({ message, draftText }: { message: string; draftText?: () => string }) {
  const { copy, fallbackBox } = useCopy(draftText)
  return (
    <div role="alert" className={danger}>
      <p>{message}</p>
      {draftText && (
        <div>
          <Button size="sm" variant="secondary" onClick={() => void copy()}>
            Copy draft
          </Button>
        </div>
      )}
      {fallbackBox}
    </div>
  )
}

/** Network failure (or 5xx): nothing was saved, the draft is still here. */
export function NetworkBanner({
  onRetry,
  pending,
  children,
}: {
  onRetry: () => void
  pending: boolean
  children: ReactNode
}) {
  return (
    <div role="alert" className={danger}>
      <p>{children}</p>
      <div>
        <Button size="sm" variant="secondary" onClick={onRetry} pending={pending}>
          Retry
        </Button>
      </div>
    </div>
  )
}

export function MessageBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className={danger}>
      {children}
    </div>
  )
}
