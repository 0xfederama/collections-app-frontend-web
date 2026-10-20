import { ConflictBanner, GoneBanner, MessageBanner, NetworkBanner } from './Banners'

export type Failure =
  { kind: 'conflict' } | { kind: 'gone' } | { kind: 'network' } | { kind: 'other'; message: string }

/** The error and conflict banners under a field editor. */
export function FieldEditorBanner({
  failure,
  otherErrors,
  draftText,
  onReload,
  reloading,
  reloadFailed,
  onRetry,
  pending,
}: {
  failure: Failure | null
  otherErrors: string[]
  draftText: () => string
  onReload: () => void
  reloading: boolean
  reloadFailed: boolean
  onRetry: () => void
  pending: boolean
}) {
  return (
    <>
      {failure?.kind === 'conflict' && (
        <ConflictBanner
          message="Someone else changed this item while you were editing. Your change has not been saved."
          draftText={draftText}
          onReload={onReload}
          reloading={reloading}
          reloadFailed={reloadFailed}
        />
      )}
      {failure?.kind === 'gone' && (
        <GoneBanner
          message="This item was deleted or moved to Trash. Your change has not been saved."
          draftText={draftText}
        />
      )}
      {failure?.kind === 'network' && (
        <NetworkBanner onRetry={onRetry} pending={pending}>
          The server could not be reached. Nothing was saved, and your change is still here.
        </NetworkBanner>
      )}
      {failure?.kind === 'other' && <MessageBanner>{failure.message}</MessageBanner>}
      {otherErrors.length > 0 && (
        <MessageBanner>
          <ul className="list-disc pl-5">
            {otherErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </MessageBanner>
      )}
    </>
  )
}
