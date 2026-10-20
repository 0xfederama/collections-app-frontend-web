import type { MouseEvent, RefObject } from 'react'
import { MarkdownView } from '../../../components/markdown'
import { focusRing, PenButton } from '../inline/controls'

export function DescriptionView({
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
