import { useRef, useState, type KeyboardEvent } from 'react'
import { useToast } from '../../components/ui'
import { type List as TreeList, classifyError, useUpdateList } from '../tree'

const MAX_LENGTH = 200

const sameLook = 'w-full rounded-md px-1.5 -mx-1.5 text-left'

/**
 * The list title, renamed in place: click it to edit, Enter (or leaving the field) saves, Esc
 * cancels. `If-Match` comes from the list as it was when editing started, so another person's
 * rename gives a 412 and the draft stays in the field (never a silent overwrite).
 */
export function ListTitle({ list }: { list: TreeList }) {
  const [editing, setEditing] = useState<TreeList | null>(null)
  const [draft, setDraft] = useState('')
  const updateList = useUpdateList()
  const toast = useToast()
  const busy = useRef(false)
  const button = useRef<HTMLButtonElement>(null)
  // After saving or cancelling the field disappears: focus goes back to the title.
  const [restoreFocus, setRestoreFocus] = useState(false)

  const finish = () => {
    setEditing(null)
    setRestoreFocus(true)
  }
  const save = async () => {
    if (!editing || busy.current) return
    const next = draft.trim()
    if (!next || next === editing.name) return finish()
    busy.current = true
    try {
      await updateList.mutateAsync({ list: editing, patch: { name: next } })
      finish()
    } catch (error) {
      const failure = classifyError(error, 'list')
      toast({ kind: 'error', title: 'Could not rename the list', description: failure.message })
    } finally {
      busy.current = false
    }
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      finish()
    }
  }

  if (editing) {
    return (
      <input
        aria-label="List name"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- renaming starts with a click on the title, so the name field takes focus
        autoFocus
        value={draft}
        maxLength={MAX_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => void save()}
        onFocus={(event) => event.currentTarget.select()}
        className={`${sameLook} border border-border-strong bg-surface py-0 font-[inherit] tracking-[inherit] outline-none focus:border-accent`}
      />
    )
  }
  return (
    // eslint-disable-next-line jsx-a11y/role-supports-aria-props -- aria-description ("Click to rename") is a global property in ARIA 1.3, which this rule's role table predates
    <button
      ref={(node) => {
        button.current = node
        if (node && restoreFocus) {
          setRestoreFocus(false)
          node.focus()
        }
      }}
      type="button"
      aria-description="Click to rename"
      onClick={() => {
        setEditing(list)
        setDraft(list.name)
      }}
      className={`${sameLook} cursor-text break-words hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
    >
      {list.name}
    </button>
  )
}
