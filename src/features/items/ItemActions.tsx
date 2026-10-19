import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AlertDialog, Button, Combobox, Dialog, useToast } from '../../components/ui'
import { FolderInput, Trash2 } from '../../components/ui/icons'
import { treeKeys, useTreeIndex, type TreeIndex, type TreeNode } from '../tree/api'
import { countsText } from '../trash/model'
import { itemKeys, useDeleteItem, useMoveItem, type Item, type ItemType } from './api'
import { classifyItemError, type ItemError } from './errors'
import { useEditGuard } from './inline/guard'

function ErrorBox({ error }: { error: ItemError }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger-text"
    >
      {error.message}
    </div>
  )
}

/** Every list of the item's type as `Folder › Sub › List`, in tree order (items only move within a type). */
function listOptions(index: TreeIndex, currentListId: string, type: ItemType) {
  const out: { value: string; label: string; disabled?: boolean }[] = []
  const visit = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'folder') visit(node.children)
      else if (node.list.type === type) {
        const path = [...index.ancestorsOf(node.id).map((f) => f.name), node.list.name].join(' › ')
        const current = node.id === currentListId
        out.push({
          value: node.id,
          label: current ? `${path} (current list)` : path,
          disabled: current,
        })
      }
    }
  }
  visit(index.nodes)
  return out
}

interface ItemActionsState {
  move: () => void
  remove: () => void
  /** The Move and Delete dialogs: render them once. */
  dialogs: ReactNode
}

/** Move and Delete share their dialogs with the footer buttons of `ItemView`. */
export function useItemActions(item: Item): ItemActionsState {
  const [dialog, setDialog] = useState<'move' | 'delete' | null>(null)
  return {
    move: () => setDialog('move'),
    remove: () => setDialog('delete'),
    dialogs: (
      <>
        {dialog === 'move' && <MoveItemDialog item={item} onClose={() => setDialog(null)} />}
        {dialog === 'delete' && <DeleteItemDialog item={item} onClose={() => setDialog(null)} />}
      </>
    ),
  }
}

/**
 * Move and Delete at the bottom of the item page (F009-W4, superseding F-008 W10's "…" menu),
 * with the dialogs of `useItemActions`. Errors follow UI_SPEC §9: 412
 * loads the latest item and asks to try again, 404 says the item is gone and goes back to the
 * list, 409 asks for another destination, a network failure keeps the dialog open to retry.
 */
export function ItemActions({ actions }: { actions: ItemActionsState }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={actions.move}>
        <FolderInput aria-hidden className="size-4" />
        Move
      </Button>
      <Button variant="secondary" size="sm" onClick={actions.remove}>
        <Trash2 aria-hidden className="size-4" />
        Delete
      </Button>
    </div>
  )
}

/** Shared failure handling of the two dialogs. Returns the error to show, or null when handled. */
function useFailure(item: Item, onClose: () => void) {
  const client = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { search } = useLocation()
  const guard = useEditGuard()
  const [error, setError] = useState<ItemError | null>(null)

  const fail = (caught: unknown) => {
    const classified = classifyItemError(caught)
    if (classified.kind === 'conflict') {
      void client.invalidateQueries({ queryKey: itemKeys.detail(item.id) })
    }
    if (classified.kind === 'unavailable') {
      void client.invalidateQueries({ queryKey: treeKeys.tree })
    }
    if (classified.kind === 'not_found') {
      void client.invalidateQueries({ queryKey: treeKeys.tree })
      toast({ kind: 'error', title: classified.message })
      onClose()
      guard.allowLeave()
      void navigate({ pathname: `/lists/${item.list_id}`, search }, { replace: true })
      return
    }
    setError(classified)
  }
  return { error, setError, fail, guard }
}

function MoveItemDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const tree = useTreeIndex()
  const move = useMoveItem()
  const toast = useToast()
  const navigate = useNavigate()
  const { error, setError, fail, guard } = useFailure(item, onClose)
  const [target, setTarget] = useState<string | null>(null)

  const options = tree.status === 'success' ? listOptions(tree.index, item.list_id, item.type) : []
  const choice = options.find((o) => o.value === target && !o.disabled)

  const submit = async () => {
    if (!choice) return
    setError(null)
    try {
      const moved = await move.mutateAsync({ item, listId: choice.value })
      toast({ kind: 'success', title: 'Item moved', description: choice.label })
      onClose()
      guard.allowLeave()
      void navigate(`/lists/${moved.list_id}/items/${moved.id}`)
    } catch (caught) {
      fail(caught)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Move “${item.title}”`}
      description="Choose the list to move it to. Only lists of the same type are offered. It goes to the end of that list."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} pending={move.isPending} disabled={!choice}>
            Move
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Combobox
          label="Destination list"
          options={options}
          value={target}
          onValueChange={setTarget}
          placeholder={tree.status === 'pending' ? 'Loading lists…' : 'Search lists'}
          emptyMessage="No other lists of this type"
        />
        {tree.status === 'error' && (
          <ErrorBox
            error={{ kind: 'network', message: 'The lists could not be loaded. Close and retry.' }}
          />
        )}
        {error && <ErrorBox error={error} />}
      </div>
    </Dialog>
  )
}

function DeleteItemDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const remove = useDeleteItem()
  const toast = useToast()
  const navigate = useNavigate()
  const { search } = useLocation()
  const { error, setError, fail, guard } = useFailure(item, onClose)

  const confirm = async () => {
    setError(null)
    try {
      await remove.mutateAsync({ item })
      toast({ kind: 'success', title: 'Item moved to Trash', description: item.title })
      onClose()
      guard.allowLeave()
      void navigate({ pathname: `/lists/${item.list_id}`, search }, { replace: true })
    } catch (caught) {
      fail(caught)
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Delete “${item.title}”?`}
      description={`This moves “${item.title}” to Trash: ${countsText({ folders: 0, lists: 0, items: 1 })}. You can restore it from there.`}
      confirmLabel="Delete"
      destructive
      keepOpen
      pending={remove.isPending}
      onConfirm={() => void confirm()}
    >
      {error && <ErrorBox error={error} />}
    </AlertDialog>
  )
}
