import { useEffect, useRef, type MouseEvent } from 'react'
import { MarkdownView } from '../../components/markdown'
import { focusRing } from '../../components/ui'

/**
 * Always shown in full. There is no pen: a click on the text (or the placeholder) edits. Keyboard
 * users reach "Edit description", a button that shows on focus.
 */
export function DescriptionView({
  text,
  restoreFocus,
  onEdit,
}: {
  text: string | null
  restoreFocus: boolean
  onEdit: () => void
}) {
  const entryRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (restoreFocus) entryRef.current?.focus()
  }, [restoreFocus])

  if (!text) {
    return (
      <section aria-label="List description" className="max-w-prose text-body text-text-muted">
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
    <section aria-label="List description" className="max-w-prose text-body text-text-muted">
      {/* The click on the text is a mouse shortcut: this is the keyboard path, visible on focus. */}
      <button
        ref={entryRef}
        type="button"
        onClick={onEdit}
        className={`rounded-sm text-ui text-text-muted underline underline-offset-2 sr-only focus-visible:not-sr-only ${focusRing}`}
      >
        Edit description
      </button>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the Edit description button above is the keyboard path; a click on the text is a pointer shortcut */}
      <div
        onClick={onTextClick}
        className="cursor-text rounded-md transition-colors hover:bg-fill/60"
      >
        <MarkdownView source={text} />
      </div>
    </section>
  )
}
