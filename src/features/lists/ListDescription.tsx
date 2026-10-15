import { useQueryClient } from '@tanstack/react-query'
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { MarkdownView } from '../../components/markdown'
import { Button, IconButton, Skeleton, useToast } from '../../components/ui'
import { Check, Pencil, X } from '../../components/ui/icons'
import { readStored, STORAGE_KEYS, writeStored } from '../../lib/storage'
import { byteLength, formatBytes } from '../items/content/limits'
import { treeKeys, type List as TreeList, type TreeData } from '../tree/api'
import { classifyError, type TreeError } from '../tree/errors'
import { useUpdateList } from '../tree/mutations'

// The CodeMirror chunk downloads when the editor first opens, like the item description editor.
const MarkdownEditor = lazy(() => import('../items/content/MarkdownEditor'))

/** API: a list description is Markdown of at most 64 KiB of UTF-8 (bytes, not characters). */
export const MAX_DESCRIPTION_BYTES = 64 * 1024

const parseIds = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : undefined

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

/**
 * The list's Markdown description, edited in place. Click the text (or the "No description yet"
 * placeholder), or the pen, to write; ✓ saves, ✕ or Esc cancels, Ctrl/Cmd+Enter saves (Enter is a
 * new line). The editor works on a snapshot of the list taken when editing starts: `If-Match` comes
 * from it, and a 412 keeps the draft (Copy draft / Reload latest, no auto-merge).
 */
export function ListDescription({
  treeList,
  text,
}: {
  /** The list as the tree has it: the snapshot `If-Match` comes from when editing starts. */
  treeList: TreeList
  /** The saved description (`null` when there is none). */
  text: string | null
}) {
  const [editing, setEditing] = useState<TreeList | null>(null)
  // After ✓, ✕ or Esc the editor disappears, so focus goes back to the way in.
  const [restoreFocus, setRestoreFocus] = useState(false)
  if (editing) {
    return (
      <DescriptionEditor
        initial={editing}
        onDone={() => {
          setRestoreFocus(true)
          setEditing(null)
        }}
      />
    )
  }
  return (
    <DescriptionView
      listId={treeList.id}
      text={text}
      restoreFocus={restoreFocus}
      onEdit={() => setEditing(treeList)}
    />
  )
}

/** Shown expanded unless this list was collapsed on this device; the pen shows on hover and keyboard focus. */
function DescriptionView({
  listId,
  text,
  restoreFocus,
  onEdit,
}: {
  listId: string
  text: string | null
  restoreFocus: boolean
  onEdit: () => void
}) {
  const penRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (restoreFocus) penRef.current?.focus()
  }, [restoreFocus])
  const [collapsed, setCollapsed] = useState(() =>
    readStored(STORAGE_KEYS.listDescriptionCollapsed, parseIds, []).includes(listId),
  )
  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    const others = readStored(STORAGE_KEYS.listDescriptionCollapsed, parseIds, []).filter(
      (id) => id !== listId,
    )
    writeStored(STORAGE_KEYS.listDescriptionCollapsed, next ? [...others, listId] : others)
  }
  const regionId = `list-description-${listId}`

  const pen = (
    <IconButton
      ref={penRef}
      aria-label="Edit description"
      title="Edit description"
      onClick={onEdit}
      className="size-8 text-text-muted opacity-0 group-hover/desc:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 pointer-coarse:size-11"
    >
      <Pencil aria-hidden />
    </IconButton>
  )

  if (!text) {
    return (
      <section
        aria-label="List description"
        className="group/desc flex max-w-prose items-center gap-1 text-xs"
      >
        <button
          type="button"
          onClick={onEdit}
          className={`rounded-sm text-text-muted italic hover:text-text ${focusRing}`}
        >
          No description yet
        </button>
        {pen}
      </section>
    )
  }

  // A click on the text starts editing; a click on a link inside it follows the link.
  const onTextClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) return
    if (window.getSelection()?.toString()) return
    onEdit()
  }
  return (
    <section aria-label="List description" className="group/desc max-w-prose text-sm">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={regionId}
          onClick={toggle}
          className={`rounded-sm text-accent-text underline underline-offset-2 ${focusRing}`}
        >
          {collapsed ? 'Expand description' : 'Collapse description'}
        </button>
        {pen}
      </div>
      {/* The click is a mouse shortcut: keyboard users have the pen button. */}
      <div
        id={regionId}
        hidden={collapsed}
        onClick={onTextClick}
        className="mt-2 cursor-text rounded-sm"
      >
        {!collapsed && <MarkdownView source={text} />}
      </div>
    </section>
  )
}

function DescriptionEditor({ initial, onDone }: { initial: TreeList; onDone: () => void }) {
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
      ?.lists.find((list) => list.id === base.id)
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
