import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui'
import { useItemContent } from '../api'
import { useEditGuard } from '../inline/guard'
import { DescriptionEditor } from './DescriptionEditor'
import { DescriptionView } from './DescriptionView'
import { HistoryDrawer } from './HistoryDrawer'

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
