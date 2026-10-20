import { useState } from 'react'
import type { List as TreeList } from '../tree'
import { DescriptionEditor } from './ListDescriptionEditor'
import { DescriptionView } from './ListDescriptionView'

/**
 * The list's Markdown description, edited in place. Click the text (or the "Add a description"
 * placeholder) to write; ✓ saves, ✕ or Esc cancels, Ctrl/Cmd+Enter saves (Enter is a
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
