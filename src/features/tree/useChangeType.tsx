import { useState, type ReactNode } from 'react'
import { AlertDialog, useToast, type ItemType, type SelectEntry } from '../../components/ui'
import { typeDefinition, typeName, typeOptions } from '../items'
import { useTypes } from '../settings'
import type { List as TreeList } from './api'
import { classifyError } from './errors'
import { useUpdateList } from './mutations'

/**
 * Changing a list's type (F-007), used by the list's "…" menu. A change on a list with items first
 * asks for confirmation: it permanently clears the type fields of every item in the list, trashed
 * ones too. The server does the clearing; nothing is cleared here. Render `dialog` next to the menu.
 */
export function useChangeType(list: TreeList): {
  pick: (type: ItemType) => void
  dialog: ReactNode
  options: SelectEntry[]
  currentName: string
} {
  const toast = useToast()
  const definitions = useTypes()
  const options = typeOptions(definitions.data)
  const nameOf = (key: ItemType) => typeName(typeDefinition(definitions.data, key), key)
  const current = typeDefinition(definitions.data, list.type)
  const update = useUpdateList()
  const [target, setTarget] = useState<{ type: ItemType } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const change = async (type: ItemType) => {
    setError(null)
    try {
      await update.mutateAsync({ list, patch: { type } })
      toast({ kind: 'success', title: `Type changed to ${nameOf(type)}` })
      setTarget(null)
    } catch (caught) {
      const failure = classifyError(caught, 'list')
      // With the dialog closed (no items) the toast is the only place to say it.
      if (target) setError(failure.message)
      else toast({ kind: 'error', title: 'Couldn’t change the type', description: failure.message })
    }
  }

  const pick = (type: ItemType) => {
    if (type === list.type) return
    if (list.item_count > 0) {
      setError(null)
      setTarget({ type })
    } else void change(type)
  }

  const dialog = target ? (
    <AlertDialog
      open
      onOpenChange={(open) => !open && !update.isPending && setTarget(null)}
      title={`Change ${list.name} to ${nameOf(target.type)}?`}
      description={`This permanently clears the ${list.type === null ? '' : `${nameOf(list.type)} `}details${current?.allows_price && !typeDefinition(definitions.data, target.type)?.allows_price ? ' and the price' : ''} of all ${list.item_count} ${list.item_count === 1 ? 'item' : 'items'} in this list, trashed ones included. There is no undo. Titles, images, descriptions and history stay.`}
      confirmLabel="Clear details and change"
      destructive
      keepOpen
      pending={update.isPending}
      onConfirm={() => void change(target.type)}
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg p-3 text-ui text-danger-text"
        >
          {error}
        </p>
      )}
    </AlertDialog>
  ) : null

  return { pick, dialog, options, currentName: nameOf(list.type) }
}
