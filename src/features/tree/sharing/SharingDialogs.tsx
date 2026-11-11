import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../../components/ui'
import { invalidateContent } from '../../../data/invalidate'
import { useMe, useUsers, findUser, userLabel } from '../../account'
import type { Folder, TreeIndex } from '../api'
import type { TreeError } from '../errors'
import { isOpenWithin } from '../treeLookup'
import { LeaveDialog } from './LeaveDialog'
import { sharingFailure } from './messages'
import { useRemoveFolderMember } from './mutations'
import { UNKNOWN_PERSON } from './people'
import { ShareDialog } from './ShareDialog'

/** The Share / People dialog and the Leave confirm of a top-level folder, opened from its menu. */
export function SharingDialogs({
  type,
  folder,
  index,
  activeListId,
  onClose,
}: {
  type: 'share' | 'leave'
  folder: Folder
  index: TreeIndex
  activeListId: string | null
  onClose: () => void
}) {
  const me = useMe().data
  const users = useUsers().data
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useRemoveFolderMember()
  const [error, setError] = useState<TreeError | null>(null)

  const gone = () => {
    onClose()
    toast({
      kind: 'info',
      title: 'That folder no longer exists',
      description: 'The folders and lists were refreshed.',
    })
  }
  if (!me) return null

  if (type === 'share')
    return <ShareDialog folder={folder} me={me} users={users} onClose={onClose} onGone={gone} />

  const owner = findUser(users, folder.owner_user_id)
  const leave = async () => {
    setError(null)
    const wasActive = isOpenWithin(index, activeListId, folder.id)
    try {
      await remove.mutateAsync({ folderId: folder.id, userId: me.id })
    } catch (caught) {
      const failure = sharingFailure(caught, { folderName: folder.name, meEmail: me.email })
      if (failure) setError(failure)
      else gone()
      return
    }
    await invalidateContent(queryClient)
    toast({ kind: 'success', title: `Left ‘${folder.name}’` })
    onClose()
    if (wasActive) void navigate('/')
  }
  return (
    <LeaveDialog
      name={folder.name}
      ownerLabel={owner ? userLabel(owner) : UNKNOWN_PERSON}
      pending={remove.isPending}
      error={error}
      onConfirm={() => void leave()}
      onClose={onClose}
    />
  )
}
