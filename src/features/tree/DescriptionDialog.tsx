import { lazy, Suspense, useState, type FormEvent } from 'react'
import { MarkdownView } from '../../components/markdown'
import { Button, Dialog, SegmentedControl, Skeleton } from '../../components/ui'
import { byteLength, formatBytes } from '../items/content/limits'
import type { List } from './api'
import { FormError } from './FormError'
import { useAction } from './useAction'

// The CodeMirror chunk downloads when the dialog first opens, like the item description editor.
const MarkdownEditor = lazy(() => import('../items/content/MarkdownEditor'))

/** API: a list description is Markdown of at most 64 KiB of UTF-8 (bytes, not characters). */
export const MAX_DESCRIPTION_BYTES = 64 * 1024

export interface DescriptionDialogProps {
  /** The list as the tree had it when the dialog opened: the snapshot `If-Match` comes from. */
  list: List
  onSubmit: (list: List, description: string | null) => Promise<unknown>
  onClose: () => void
  /** Refetches the tree and returns the latest list (`undefined` if it is gone). */
  onReload: () => Promise<List | undefined>
}

/** Edit a list's Markdown description (Edit / Preview). An empty text clears it (`null`). */
export function DescriptionDialog({ list, onSubmit, onClose, onReload }: DescriptionDialogProps) {
  const [base, setBase] = useState(list)
  const [text, setText] = useState(list.description ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const { error, pending, run, clearError, setError } = useAction('list')

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = text.trim()
    if (await run(() => onSubmit(base, trimmed === '' ? null : trimmed))) onClose()
  }

  const reload = async () => {
    const latest = await onReload()
    if (latest === undefined) {
      setError({
        kind: 'not_found',
        message: 'This list no longer exists. The folders and lists were refreshed.',
        fieldErrors: [],
      })
      return
    }
    setBase(latest)
    setText(latest.description ?? '')
    clearError()
  }

  const bytes = byteLength(text)
  const tooLong = bytes > MAX_DESCRIPTION_BYTES
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit description"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="tree-description-form" pending={pending} disabled={tooLong}>
            Save
          </Button>
        </>
      }
    >
      <form id="tree-description-form" onSubmit={submit} className="flex flex-col gap-4">
        <SegmentedControl
          aria-label="Description view"
          value={mode}
          onValueChange={(value) => setMode(value as 'edit' | 'preview')}
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
        />
        {mode === 'edit' ? (
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <MarkdownEditor
              value={text}
              onChange={setText}
              label="Description"
              placeholderText="Write in Markdown…"
            />
          </Suspense>
        ) : text.trim() ? (
          <div
            role="region"
            aria-label="Description preview"
            className="rounded-sm border border-border p-3"
          >
            <MarkdownView source={text} />
          </div>
        ) : (
          <p className="text-sm text-text-muted">Nothing to preview yet.</p>
        )}
        <p
          role={tooLong ? 'alert' : undefined}
          className={tooLong ? 'text-sm text-danger-text' : 'text-xs text-text-muted'}
        >
          {tooLong
            ? `The description is ${formatBytes(bytes)}; the limit is ${formatBytes(MAX_DESCRIPTION_BYTES)}. Shorten it to save.`
            : `${formatBytes(bytes)} / ${formatBytes(MAX_DESCRIPTION_BYTES)}`}
        </p>
        {error && (
          <FormError
            error={error}
            pending={pending}
            onReload={() => void reload()}
            onRetry={() => void submit()}
          />
        )}
      </form>
    </Dialog>
  )
}
