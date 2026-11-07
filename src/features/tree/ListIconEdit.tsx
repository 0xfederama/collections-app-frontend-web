import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui'
import { treeKeys } from '../../data/keys'
import { api, unwrap } from '../../lib/api'
import { ListIconPopover, type IconChoice } from '../lists'
import type { List } from './api'
import { classifyError } from './errors'
import { FormError } from './FormError'
import { useAction } from './useAction'
import { useUpdateListIcon } from './mutations'

const choiceOf = (list: List): IconChoice => ({ icon: list.icon, icon_color: list.icon_color })

/**
 * Changes an existing list's icon in a popover: every choice is its own PATCH, applied at once.
 * `If-Match` comes from the list as it was when the popover opened; after our own successful
 * write the snapshot moves to the response, so the next choice is not a false conflict, while
 * someone else's change gives a 412 (the choice is not applied and "Reload latest" offers the
 * current list). Nothing is retried, and one write runs at a time.
 */
export function ListIconEdit({
  list,
  open,
  onOpenChange,
  children,
  anchorEl,
  onCloseAutoFocus,
}: {
  list: List
  open: boolean
  onOpenChange: (open: boolean) => void
  children?: ReactNode
  anchorEl?: HTMLElement | null
  onCloseAutoFocus?: (event: Event) => void
}) {
  const [snapshot, setSnapshot] = useState(list)
  const [wasOpen, setWasOpen] = useState(open)
  const update = useUpdateListIcon()
  const queryClient = useQueryClient()
  const action = useAction('list')
  const toast = useToast()

  // Each opening starts from the list as it is now (the version the user saw).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSnapshot(list)
      action.clearError()
    }
  }

  const apply = async (choice: IconChoice) => {
    action.clearError()
    try {
      setSnapshot(await update.mutateAsync({ list: snapshot, icon: choice }))
      return true
    } catch (caught) {
      const error = classifyError(caught, 'list')
      action.setError(error)
      toast({ kind: 'error', title: error.message })
      return false
    }
  }

  const reload = async () => {
    try {
      const latest = await unwrap(
        api.GET('/api/v1/lists/{id}', { params: { path: { id: snapshot.id } } }),
      )
      setSnapshot(latest)
      action.clearError()
      void queryClient.invalidateQueries({ queryKey: treeKeys.tree })
    } catch {
      toast({ kind: 'error', title: 'The latest list could not be loaded' })
    }
  }

  return (
    <ListIconPopover
      value={choiceOf(snapshot)}
      open={open}
      onOpenChange={onOpenChange}
      onChange={apply}
      anchorEl={anchorEl}
      onCloseAutoFocus={onCloseAutoFocus}
      pending={update.isPending}
      notice={
        action.error && (
          <FormError
            error={action.error}
            pending={update.isPending}
            onReload={action.error.kind === 'conflict' ? () => void reload() : undefined}
          />
        )
      }
    >
      {children}
    </ListIconPopover>
  )
}
