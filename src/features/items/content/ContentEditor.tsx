import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { MarkdownView } from '../../../components/markdown'
import {
  AlertDialog,
  Button,
  Dialog,
  SegmentedControl,
  Skeleton,
  useToast,
} from '../../../components/ui'
import { ApiError, NetworkError } from '../../../lib/api'
import { itemKeys, useItemContent, type ItemContent } from '../api'
import { useSaveContent } from './api'
import { HistoryDrawer } from './HistoryDrawer'
import { formatBytes, isTooLarge, byteLength, MAX_CONTENT_BYTES } from './limits'

// The CodeMirror chunk downloads when the description section first renders (edit mode only).
const MarkdownEditor = lazy(() => import('./MarkdownEditor'))

type Failure = 'conflict' | 'gone' | 'network' | { other: string }

const banner = 'flex flex-col gap-3 rounded-md border p-3 text-sm'

/** Loads the content, then hands a snapshot to the editor. */
export function ContentSection({
  itemId,
  listId,
  onDirtyChange,
}: {
  itemId: string
  listId: string
  onDirtyChange: (dirty: boolean) => void
}) {
  const content = useItemContent(itemId)
  if (content.status === 'pending') return <Skeleton className="h-40 w-full" />
  // A failed background refetch keeps the cached data, so an open draft is never dropped.
  if (content.status === 'error' && !content.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm">
        <p>The description could not be loaded.</p>
        <Button size="sm" variant="secondary" onClick={() => void content.refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  return (
    <ContentEditor
      itemId={itemId}
      listId={listId}
      initial={content.data}
      onDirtyChange={onDirtyChange}
    />
  )
}

/**
 * The description editor (UI_SPEC §4, §9). Independent of the Basics form: its own `c-N` version,
 * Save and conflict handling. It edits a snapshot (`base`), and `If-Match` comes from that snapshot,
 * so a background refetch can never become a silent overwrite. Whatever goes wrong, the draft stays.
 */
function ContentEditor({
  itemId,
  listId,
  initial,
  onDirtyChange,
}: {
  itemId: string
  listId: string
  initial: ItemContent
  onDirtyChange: (dirty: boolean) => void
}) {
  const client = useQueryClient()
  const toast = useToast()
  const save = useSaveContent()
  const [base, setBase] = useState(initial)
  const [draft, setDraft] = useState(initial.body)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [failure, setFailure] = useState<Failure | null>(null)
  const [dialog, setDialog] = useState<'reload' | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const [copyFallback, setCopyFallback] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const copyRef = useRef<HTMLTextAreaElement>(null)

  const dirty = draft !== base.body
  useEffect(() => {
    onDirtyChange(dirty)
    return () => onDirtyChange(false)
  }, [dirty, onDirtyChange])

  const tooLarge = isTooLarge(draft)
  // A refetch that brought a newer version (e.g. after a refused restore) is taken over while the
  // draft is clean, so the next `If-Match` is current. A dirty draft is never touched.
  if (!dirty && initial.version !== base.version) {
    setBase(initial)
    setDraft(initial.body)
  }
  const adopt = (content: ItemContent) => {
    setBase(content)
    setDraft(content.body)
    setFailure(null)
  }

  const doSave = async () => {
    setFailure(null)
    if (tooLarge) return
    try {
      const saved = await save.mutateAsync({ itemId, listId, version: base.version, body: draft })
      if (saved.version === base.version) toast({ kind: 'info', title: 'No changes' })
      else toast({ kind: 'success', title: 'Description saved' })
      setBase(saved)
      setDraft(saved.body)
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

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      toast({ kind: 'success', title: 'Draft copied to the clipboard' })
    } catch {
      setCopyFallback(draft)
    }
  }

  // The draft is only dropped once the latest content was fetched.
  const reloadLatest = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: itemKeys.content(itemId), exact: true },
        { throwOnError: true },
      )
      const latest = client.getQueryData<ItemContent>(itemKeys.content(itemId))
      if (latest) adopt(latest)
      setDialog(null)
    } catch {
      setDialog(null)
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  const failed = failure !== null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label="Description view"
          value={mode}
          onValueChange={(value) => setMode(value as 'edit' | 'preview')}
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
        />
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={dirty}
            onClick={() => setHistoryOpen(true)}
          >
            History
          </Button>
          {dirty && <p className="text-xs text-text-muted">Save or discard first.</p>}
        </div>
      </div>

      {failure === 'conflict' && (
        <div
          role="alert"
          className={`${banner} border-warning-border bg-warning-bg text-warning-text`}
        >
          <p>
            Someone else changed the description while you were editing. Your text has not been
            saved.
          </p>
          {reloadFailed && <p>The latest version could not be loaded. Try again.</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void copyDraft()}>
              Copy my draft
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDialog('reload')}>
              Reload latest
            </Button>
          </div>
        </div>
      )}
      {failure === 'gone' && (
        <div
          role="alert"
          className={`${banner} border-danger-border bg-danger-bg text-danger-text`}
        >
          <p>This item was deleted or moved to Trash. Your text has not been saved.</p>
          <div>
            <Button size="sm" variant="secondary" onClick={() => void copyDraft()}>
              Copy my draft
            </Button>
          </div>
        </div>
      )}
      {failure === 'network' && (
        <div
          role="alert"
          className={`${banner} border-danger-border bg-danger-bg text-danger-text`}
        >
          <p>The server could not be reached. Nothing was saved, and your text is still here.</p>
          <div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void doSave()}
              pending={save.isPending}
            >
              Retry
            </Button>
          </div>
        </div>
      )}
      {typeof failure === 'object' && failure !== null && (
        <div
          role="alert"
          className={`${banner} border-danger-border bg-danger-bg text-danger-text`}
        >
          <p>{failure.other}</p>
        </div>
      )}

      {mode === 'edit' ? (
        <Suspense fallback={<Skeleton className="h-56 w-full" />}>
          <MarkdownEditor
            value={draft}
            onChange={setDraft}
            label="Description (Markdown)"
            placeholderText="Write in Markdown…"
          />
        </Suspense>
      ) : draft.trim() ? (
        <div
          aria-label="Description preview"
          role="region"
          className="rounded-sm border border-border p-3"
        >
          <MarkdownView source={draft} />
        </div>
      ) : (
        <p className="text-sm text-text-muted">Nothing to preview yet.</p>
      )}

      {tooLarge && (
        <p role="alert" className="text-sm text-danger-text">
          The description is {formatBytes(byteLength(draft))}; the limit is{' '}
          {formatBytes(MAX_CONTENT_BYTES)}. Shorten it to save.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => void doSave()}
          pending={save.isPending}
          disabled={!dirty || tooLarge || failure === 'conflict' || failure === 'gone'}
        >
          Save description
        </Button>
        {dirty && !failed && <span className="text-xs text-text-muted">Unsaved changes</span>}
      </div>

      <HistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        itemId={itemId}
        listId={listId}
        currentVersion={base.version}
        onRestored={adopt}
      />
      {dialog === 'reload' && (
        <AlertDialog
          open
          title="Replace your unsaved text with the latest version?"
          description="Your draft is discarded. Use Copy my draft first if you want to keep it."
          confirmLabel="Reload latest"
          cancelLabel="Keep my draft"
          keepOpen
          pending={reloading}
          onOpenChange={(open) => !open && setDialog(null)}
          onConfirm={() => void reloadLatest()}
        />
      )}
      {copyFallback !== null && (
        <Dialog
          open
          onOpenChange={(open) => !open && setCopyFallback(null)}
          title="Copy your draft"
          description="Your browser would not copy it for you. Select the text below and copy it."
          initialFocus={copyRef}
          footer={<Button onClick={() => setCopyFallback(null)}>Done</Button>}
        >
          <textarea
            ref={copyRef}
            readOnly
            aria-label="Your draft"
            rows={10}
            value={copyFallback}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-sm border border-border-strong bg-surface p-3 font-mono text-sm text-text"
          />
        </Dialog>
      )}
    </div>
  )
}
