import { useState, type ReactNode } from 'react'
import { AlertDialog, kindLabels, useToast, type ItemKind } from '../../components/ui'
import type { List as TreeList } from './api'
import { classifyError } from './errors'
import { useUpdateList } from './mutations'

export const kindOptions = (Object.keys(kindLabels) as ItemKind[]).map((kind) => ({
  value: kind,
  label: kindLabels[kind],
}))

/**
 * Changing a list's kind (F-007), used by the list's "…" menu. A change on a list with items first
 * asks for confirmation: it permanently clears the kind fields of every item in the list, trashed
 * ones too. The server does the clearing; nothing is cleared here. Render `dialog` next to the menu.
 */
export function useChangeKind(list: TreeList): {
  pick: (kind: ItemKind) => void
  dialog: ReactNode
} {
  const toast = useToast()
  const update = useUpdateList()
  const [target, setTarget] = useState<ItemKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const change = async (kind: ItemKind) => {
    setError(null)
    try {
      await update.mutateAsync({ list, patch: { kind } })
      toast({ kind: 'success', title: `Kind changed to ${kindLabels[kind]}` })
      setTarget(null)
    } catch (caught) {
      const failure = classifyError(caught, 'list')
      // With the dialog closed (no items) the toast is the only place to say it.
      if (target) setError(failure.message)
      else toast({ kind: 'error', title: 'Couldn’t change the kind', description: failure.message })
    }
  }

  const pick = (kind: ItemKind) => {
    if (kind === list.kind) return
    if (list.item_count > 0) {
      setError(null)
      setTarget(kind)
    } else void change(kind)
  }

  const dialog = target ? (
    <AlertDialog
      open
      onOpenChange={(open) => !open && !update.isPending && setTarget(null)}
      title={`Change ${list.name} to ${kindLabels[target]}?`}
      description={`This permanently clears the ${kindLabels[list.kind]} details of all ${list.item_count} ${list.item_count === 1 ? 'item' : 'items'} in this list, trashed ones included. There is no undo. Titles, images, descriptions and history stay.`}
      confirmLabel="Clear details and change"
      destructive
      keepOpen
      pending={update.isPending}
      onConfirm={() => void change(target)}
    >
      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
        >
          {error}
        </p>
      )}
    </AlertDialog>
  ) : null

  return { pick, dialog }
}
