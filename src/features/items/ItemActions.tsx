import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AlertDialog, Button, Combobox, Dialog, useToast } from '../../components/ui'
import { FolderInput, Pencil, Trash2 } from '../../components/ui/icons'
import { treeKeys, useTreeIndex, type TreeIndex, type TreeNode } from '../tree/api'
import { countsText } from '../trash/model'
import { itemKeys, useDeleteItem, useMoveItem, type Item, type ItemKind } from './api'
import { withEdit, withoutEdit } from './editMode'
import { classifyItemError, type ItemError } from './errors'

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

/** Every list of the item's kind as `Folder › Sub › List`, in tree order (items only move within a kind). */
function listOptions(index: TreeIndex, currentListId: string, kind: ItemKind) {
  const out: { value: string; label: string; disabled?: boolean }[] = []
  const visit = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'folder') visit(node.children)
      else if (node.list.kind === kind) {
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

/**
 * Edit (switches the page to the form, `?edit=1`), Move and Delete, with their dialogs. Errors follow UI_SPEC §9: 412
 * loads the latest item and asks to try again, 404 says the item is gone and goes back to the
 * list, 409 asks for another destination, a network failure keeps the dialog open to retry.
 */
export function ItemActions({ item }: { item: Item }) {
  const [dialog, setDialog] = useState<'move' | 'delete' | null>(null)
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void navigate({ pathname, search: withEdit(search) }, { replace: true })}
      >
        <Pencil aria-hidden className="size-4" />
        Edit
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setDialog('move')}>
        <FolderInput aria-hidden className="size-4" />
        Move
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setDialog('delete')}>
        <Trash2 aria-hidden className="size-4" />
        Delete
      </Button>
      {dialog === 'move' && <MoveItemDialog item={item} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && <DeleteItemDialog item={item} onClose={() => setDialog(null)} />}
    </div>
  )
}

/** Shared failure handling of the two dialogs. Returns the error to show, or null when handled. */
function useFailure(item: Item, onClose: () => void) {
  const client = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { search } = useLocation()
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
      void navigate(
        { pathname: `/lists/${item.list_id}`, search: withoutEdit(search) },
        { replace: true },
      )
      return
    }
    setError(classified)
  }
  return { error, setError, fail }
}

export function MoveItemDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const tree = useTreeIndex()
  const move = useMoveItem()
  const toast = useToast()
  const navigate = useNavigate()
  const { error, setError, fail } = useFailure(item, onClose)
  const [target, setTarget] = useState<string | null>(null)

  const options = tree.status === 'success' ? listOptions(tree.index, item.list_id, item.kind) : []
  const choice = options.find((o) => o.value === target && !o.disabled)

  const submit = async () => {
    if (!choice) return
    setError(null)
    try {
      const moved = await move.mutateAsync({ item, listId: choice.value })
      toast({ kind: 'success', title: 'Item moved', description: choice.label })
      onClose()
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
      description="Choose the list to move it to. Only lists of the same kind are offered. It goes to the end of that list."
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
          emptyMessage="No other lists of this kind"
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
  const { error, setError, fail } = useFailure(item, onClose)

  const confirm = async () => {
    setError(null)
    try {
      await remove.mutateAsync({ item })
      toast({ kind: 'success', title: 'Item moved to Trash', description: item.title })
      onClose()
      void navigate(
        { pathname: `/lists/${item.list_id}`, search: withoutEdit(search) },
        { replace: true },
      )
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
