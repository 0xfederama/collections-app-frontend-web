import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState, type KeyboardEvent } from 'react'
import { Skeleton, useToast } from '../../../components/ui'
import { ApiError, NetworkError } from '../../../lib/api'
import { itemKeys } from '../../../data/keys'
import type { ItemContent } from '../api'
import { ConflictBanner, GoneBanner, MessageBanner, NetworkBanner } from '../inline/Banners'
import { EditorButtons } from '../inline/controls'
import { useSaveContent } from './api'
import { byteLength, formatBytes, isTooLarge, MAX_CONTENT_BYTES } from './limits'

// The CodeMirror chunk downloads when the editor first opens.
const MarkdownEditor = lazy(() => import('./MarkdownEditor'))

type Failure = 'conflict' | 'gone' | 'network' | { other: string }

/**
 * Edits a snapshot (`base`): `If-Match` comes from it, so a background refetch can never become a
 * silent overwrite. Whatever goes wrong, the draft stays.
 */
export function DescriptionEditor({
  itemId,
  listId,
  live,
  onDirtyChange,
  onDone,
}: {
  itemId: string
  listId: string
  live: ItemContent
  onDirtyChange: (dirty: boolean) => void
  onDone: () => void
}) {
  const client = useQueryClient()
  const toast = useToast()
  const save = useSaveContent()
  const [base, setBase] = useState(live)
  const [draft, setDraft] = useState(live.body)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)

  const dirty = draft !== base.body
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const tooLarge = isTooLarge(draft)
  // A refetch that brought a newer version (e.g. after a restore) is taken over while the draft is
  // clean, so the next `If-Match` is current. A dirty draft is never touched.
  if (!dirty && live.version !== base.version) {
    setBase(live)
    setDraft(live.body)
  }

  const doSave = async () => {
    if (save.isPending || tooLarge) return
    setFailure(null)
    try {
      const saved = await save.mutateAsync({ itemId, listId, version: base.version, body: draft })
      if (saved.version === base.version) toast({ kind: 'info', title: 'No changes' })
      else toast({ kind: 'success', title: 'Description saved' })
      onDone()
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 412) return setFailure('conflict')
        if (caught.status === 404) return setFailure('gone')
        if (caught.status === 413)
          return setFailure({ other: 'The description is too large (limit 1 MiB).' })
        if (caught.status >= 500) return setFailure('network')
        return setFailure({ other: caught.detail ?? caught.title })
      }
      if (caught instanceof NetworkError) return setFailure('network')
      setFailure({ other: 'Something went wrong. Your text is kept.' })
    }
  }

  // The draft is dropped only once the latest content was fetched, and the user asked for it.
  const reloadLatest = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: itemKeys.content(itemId), exact: true },
        { throwOnError: true },
      )
      onDone()
    } catch {
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  // Captured, so CodeMirror's own Mod-Enter (a blank line) and Escape never see these keys.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onDone()
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.stopPropagation()
      void doSave()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div onKeyDownCapture={onKeyDown} className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <MarkdownEditor
              value={draft}
              onChange={setDraft}
              label="Description (Markdown)"
              placeholderText="Write in Markdown…"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the user asked to edit, so the editor takes focus when it opens
              autoFocus
            />
          </Suspense>
        </div>
        <EditorButtons
          label="description"
          saveHint="Save (Ctrl/Cmd+Enter)"
          onSave={() => void doSave()}
          onCancel={onDone}
          pending={save.isPending}
          disabled={tooLarge || failure === 'conflict' || failure === 'gone'}
        />
      </div>
      <p
        role={tooLarge ? 'alert' : undefined}
        className={tooLarge ? 'text-ui text-danger-text' : 'text-secondary text-text-muted'}
      >
        {tooLarge
          ? `The description is ${formatBytes(byteLength(draft))}; the limit is ${formatBytes(MAX_CONTENT_BYTES)}. Shorten it to save.`
          : `Markdown · Ctrl/Cmd+Enter saves, Esc cancels${dirty ? ' · Unsaved changes' : ''}`}
      </p>
      {failure === 'conflict' && (
        <ConflictBanner
          message="Someone else changed the description while you were editing. Your text has not been saved."
          draftText={() => draft}
          onReload={() => void reloadLatest()}
          reloading={reloading}
          reloadFailed={reloadFailed}
        />
      )}
      {failure === 'gone' && (
        <GoneBanner
          message="This item was deleted or moved to Trash. Your text has not been saved."
          draftText={() => draft}
        />
      )}
      {failure === 'network' && (
        <NetworkBanner onRetry={() => void doSave()} pending={save.isPending}>
          The server could not be reached. Nothing was saved, and your text is still here.
        </NetworkBanner>
      )}
      {typeof failure === 'object' && failure !== null && (
        <MessageBanner>{failure.other}</MessageBanner>
      )}
    </div>
  )
}
