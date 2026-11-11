// Public face of the tree feature (F020 boundaries): code outside features/tree imports only from here.
export { useTree, useTreeIndex } from './api'
export type { Folder, List, TreeData, TreeIndex, TreeNode } from './api'
export { classifyError } from './errors'
export type { TreeError } from './errors'
export {
  useCreateFolder,
  useDeleteFolder,
  useDeleteList,
  useMoveList,
  useUpdateList,
} from './mutations'
export { flattenFolders } from './order'
export { isInSharedFolder } from './treeLookup'
export { leavesSharedBox } from './sharing/leavesBox'
export { MoveOutConfirm } from './sharing/MoveOutConfirm'
export { DestinationPicker } from './DestinationPicker'
export type { DestinationOption } from './DestinationPicker'
export { ListActionsMenu } from './ListActionsMenu'
export { ListGate } from './ListGate'
export { ListIconEdit } from './ListIconEdit'
export { RailTree } from './RailTree'
export { SidebarTree } from './SidebarTree'
export { useTreeDialogs } from './useTreeDialogs'
