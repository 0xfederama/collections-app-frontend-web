import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { MarkdownView } from '../../components/markdown'
import { focusRing } from '../../components/ui'
import { readStored, STORAGE_KEYS, writeStored } from '../../lib/storage'

const parseIds = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : undefined

/**
 * Shown expanded unless this list was collapsed on this device. There is no pen: a click on the text
 * (or the placeholder) edits. Keyboard users reach "Edit description", a button that shows on focus.
 */
export function DescriptionView({
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
  const entryRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (restoreFocus) entryRef.current?.focus()
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

  if (!text) {
    return (
      <section aria-label="List description" className="max-w-prose text-sm">
        <button
          ref={entryRef}
          type="button"
          onClick={onEdit}
          className={`rounded-md px-1 text-text-muted italic hover:bg-fill hover:text-text ${focusRing}`}
        >
          Add a description
        </button>
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
    <section aria-label="List description" className="max-w-prose text-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={regionId}
          onClick={toggle}
          className={`rounded-sm text-accent-text underline underline-offset-2 ${focusRing}`}
        >
          {collapsed ? 'Expand description' : 'Collapse description'}
        </button>
        {/* The click on the text is a mouse shortcut: this is the keyboard path, visible on focus. */}
        <button
          ref={entryRef}
          type="button"
          onClick={onEdit}
          className={`rounded-sm text-text-muted underline underline-offset-2 sr-only focus-visible:not-sr-only ${focusRing}`}
        >
          Edit description
        </button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the Edit description button above is the keyboard path; a click on the text is a pointer shortcut */}
      <div
        id={regionId}
        hidden={collapsed}
        onClick={onTextClick}
        className="mt-2 cursor-text rounded-md transition-colors hover:bg-fill/60"
      >
        {!collapsed && <MarkdownView source={text} />}
      </div>
    </section>
  )
}
