import { useQueryClient } from '@tanstack/react-query'
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import { MarkdownView } from '../../../components/markdown'
import { Button, Skeleton, useToast } from '../../../components/ui'
import { ApiError, NetworkError } from '../../../lib/api'
import { itemKeys, useItemContent, type ItemContent } from '../api'
import { ConflictBanner, GoneBanner, MessageBanner, NetworkBanner } from '../inline/Banners'
import { useEditGuard } from '../inline/guard'
import { EditorButtons, focusRing, PenButton } from '../inline/controls'
import { useSaveContent } from './api'
import { HistoryDrawer } from './HistoryDrawer'
import { byteLength, formatBytes, isTooLarge, MAX_CONTENT_BYTES } from './limits'

// The CodeMirror chunk downloads when the editor first opens.
const MarkdownEditor = lazy(() => import('./MarkdownEditor'))

type Failure = 'conflict' | 'gone' | 'network' | { other: string }

/**
 * The item's Markdown description, edited in place (F-002). Click the text or the placeholder, or
 * the pen, to write; ✓ or Ctrl/Cmd+Enter saves, ✕ or Esc cancels. It has its own `c-N` version,
 * Save and conflict handling, separate from the item's fields: a content save does not bump the
 * item `version`. History is disabled while the editor holds unsaved text.
 */
export function DescriptionField({ itemId, listId }: { itemId: string; listId: string }) {
  const content = useItemContent(itemId)
  const guard = useEditGuard()
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const pen = useRef<HTMLButtonElement>(null)
  const placeholder = useRef<HTMLButtonElement>(null)
  const [restoreFocus, setRestoreFocus] = useState(0)
  useEffect(() => {
    if (restoreFocus > 0) (pen.current ?? placeholder.current)?.focus()
  }, [restoreFocus])
  useEffect(() => {
    guard.setDirty('description', dirty)
    return () => guard.setDirty('description', false)
  }, [dirty, guard])

  const data = content.data
  const done = () => {
    setEditing(false)
    setDirty(false)
    setRestoreFocus((n) => n + 1)
  }

  return (
    <section aria-labelledby="item-description" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="item-description" className="text-sm font-semibold text-text-muted">
          Description
        </h2>
        {data && (
          <Button
            size="sm"
            variant="ghost"
            disabled={dirty}
            title={dirty ? 'Save or cancel your text first' : undefined}
            onClick={() => setHistoryOpen(true)}
          >
            History
          </Button>
        )}
      </div>
      {data && (
        <HistoryDrawer
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          itemId={itemId}
          listId={listId}
          currentVersion={data.version}
        />
      )}
      {content.status === 'pending' && (
        <p role="status" className="text-sm text-text-muted">
          Loading description…
        </p>
      )}
      {/* A failed background refetch keeps the cached data, so an open draft is never dropped. */}
      {content.status === 'error' && !data && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p>The description could not be loaded.</p>
          <Button size="sm" variant="secondary" onClick={() => void content.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {data &&
        (editing ? (
          <DescriptionEditor
            itemId={itemId}
            listId={listId}
            live={data}
            onDirtyChange={setDirty}
            onDone={done}
          />
        ) : (
          <DescriptionView
            body={data.body}
            penRef={pen}
            placeholderRef={placeholder}
            onEdit={() => setEditing(true)}
          />
        ))}
    </section>
  )
}

function DescriptionView({
  body,
  penRef,
  placeholderRef,
  onEdit,
}: {
  body: string
  penRef: RefObject<HTMLButtonElement | null>
  placeholderRef: RefObject<HTMLButtonElement | null>
  onEdit: () => void
}) {
  if (!body.trim()) {
    return (
      <div className="group/desc relative">
        <button
          ref={placeholderRef}
          type="button"
          onClick={onEdit}
          className={`rounded-sm text-sm text-text-muted italic hover:text-text ${focusRing}`}
        >
          Click to start writing
        </button>
      </div>
    )
  }
  // A click on the text starts editing; a click on a link inside it follows the link. The pen is
  // the keyboard path.
  const onClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) return
    if (window.getSelection()?.toString()) return
    onEdit()
  }
  return (
    <div className="group/desc relative">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the Edit description pen beside this text is the keyboard path to the editor; a click on the text is a pointer shortcut */}
      <div onClick={onClick} className="cursor-text rounded-sm pr-9 pointer-coarse:pr-12">
        <MarkdownView source={body} />
      </div>
      <PenButton ref={penRef} group="desc" label="Edit description" onClick={onEdit} />
    </div>
  )
}

/**
 * Edits a snapshot (`base`): `If-Match` comes from it, so a background refetch can never become a
 * silent overwrite. Whatever goes wrong, the draft stays.
 */
function DescriptionEditor({
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
        className={tooLarge ? 'text-sm text-danger-text' : 'text-xs text-text-muted'}
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
