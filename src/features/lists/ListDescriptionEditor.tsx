import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useState, type KeyboardEvent } from 'react'
import { Button, IconButton, Skeleton, useToast } from '../../components/ui'
import { Check, X } from '../../components/ui/icons'
import { treeKeys } from '../../data/keys'
import { byteLength, formatBytes } from '../items'
import {
  type List as TreeList,
  type TreeData,
  classifyError,
  type TreeError,
  useUpdateList,
} from '../tree'

// The CodeMirror chunk downloads when the editor first opens, like the item description editor.
const MarkdownEditor = lazy(() => import('../items/content/MarkdownEditor'))

/** API: a list description is Markdown of at most 64 KiB of UTF-8 (bytes, not characters). */
const MAX_DESCRIPTION_BYTES = 64 * 1024

export function DescriptionEditor({ initial, onDone }: { initial: TreeList; onDone: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const update = useUpdateList()
  const [base, setBase] = useState(initial)
  const [draft, setDraft] = useState(initial.description ?? '')
  const [error, setError] = useState<TreeError | null>(null)
  const [gone, setGone] = useState(false)

  const bytes = byteLength(draft)
  const tooLong = bytes > MAX_DESCRIPTION_BYTES
  const pending = update.isPending

  const save = async () => {
    if (pending || tooLong) return
    const trimmed = draft.trim()
    const next = trimmed === '' ? null : trimmed
    if (next === (base.description ?? null)) return onDone()
    setError(null)
    try {
      await update.mutateAsync({ list: base, patch: { description: next } })
      toast({ kind: 'success', title: 'Description saved' })
      onDone()
    } catch (caught) {
      setError(classifyError(caught, 'list'))
    }
  }

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      toast({ kind: 'success', title: 'Draft copied to the clipboard' })
    } catch {
      toast({ kind: 'error', title: 'Couldn’t copy', description: 'Select the text and copy it.' })
    }
  }

  // Refetches the tree and adopts the latest list: this is the explicit way out of a 412.
  const reloadLatest = async () => {
    await queryClient.refetchQueries({ queryKey: treeKeys.tree })
    const latest = queryClient
      .getQueryData<TreeData>(treeKeys.tree)
      ?.lists?.find((list) => list.id === base.id)
    if (!latest) {
      setGone(true)
      return
    }
    setBase(latest)
    setDraft(latest.description ?? '')
    setError(null)
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
      void save()
    }
  }

  return (
    <section aria-label="List description" className="flex max-w-prose flex-col gap-2 text-sm">
      <div onKeyDownCapture={onKeyDown} className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <MarkdownEditor
              value={draft}
              onChange={setDraft}
              label="Description"
              placeholderText="Write in Markdown…"
            />
          </Suspense>
        </div>
        <div className="flex gap-1">
          <IconButton
            aria-label="Save description"
            title="Save (Ctrl/Cmd+Enter)"
            variant="secondary"
            onClick={() => void save()}
            disabled={pending || tooLong || gone}
            className="size-9"
          >
            <Check aria-hidden />
          </IconButton>
          <IconButton
            aria-label="Cancel editing description"
            title="Cancel (Esc)"
            variant="secondary"
            onClick={onDone}
            className="size-9"
          >
            <X aria-hidden />
          </IconButton>
        </div>
      </div>
      <p
        role={tooLong ? 'alert' : undefined}
        className={tooLong ? 'text-danger-text' : 'text-xs text-text-muted'}
      >
        {tooLong
          ? `The description is ${formatBytes(bytes)}; the limit is ${formatBytes(MAX_DESCRIPTION_BYTES)}. Shorten it to save.`
          : `Markdown · ${formatBytes(bytes)} / ${formatBytes(MAX_DESCRIPTION_BYTES)} · Ctrl/Cmd+Enter saves, Esc cancels`}
      </p>
      {gone && (
        <div
          role="alert"
          className="rounded-md border border-danger-border bg-danger-bg p-3 text-danger-text"
        >
          This list no longer exists. The folders and lists were refreshed.
        </div>
      )}
      {error && !gone && (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-md border border-danger-border bg-danger-bg p-3 text-danger-text"
        >
          <p>{error.message}</p>
          <div className="flex flex-wrap gap-2">
            {error.kind === 'conflict' && (
              <>
                <Button size="sm" variant="secondary" onClick={() => void copyDraft()}>
                  Copy draft
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void reloadLatest()}>
                  Reload latest
                </Button>
              </>
            )}
            {error.kind === 'network' && (
              <Button size="sm" variant="secondary" onClick={() => void save()} disabled={pending}>
                Retry
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
