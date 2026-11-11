import type { Folder } from '../api'

export interface FolderRights {
  /** Owner of a top-level folder: can add and remove members. */
  canShare: boolean
  /** Member (not the owner) of a top-level folder: can leave it. */
  canLeave: boolean
  /** A folder with members, or one owned by someone else, can't be moved (409 / 403). */
  canMove: boolean
  /** Only the owner deletes a top-level folder (403 `forbidden` for a member). */
  canDelete: boolean
}

/**
 * What the signed-in user (`meId`) may do with a folder in the menus (F-027). Sharing exists only on
 * top-level folders. While `meId` is unknown nothing is offered or hidden except sharing, because
 * the server decides anyway (403) and a wrong guess must not hide an action from the owner.
 */
export function folderRights(folder: Folder, meId: string | undefined): FolderRights {
  const topLevel = folder.parent_folder_id === null
  if (!topLevel) return { canShare: false, canLeave: false, canMove: true, canDelete: true }
  if (!meId) return { canShare: false, canLeave: false, canMove: !folder.shared, canDelete: true }
  const mine = folder.owner_user_id === meId
  return {
    canShare: mine,
    canLeave: !mine,
    canMove: mine && !folder.shared,
    canDelete: mine,
  }
}
