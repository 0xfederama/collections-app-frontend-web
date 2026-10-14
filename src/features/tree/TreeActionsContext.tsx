import { createContext, useContext } from 'react'
import type { TreeActions } from './useTreeDialogs'

export const TreeActionsContext = createContext<TreeActions | null>(null)

/** The sidebar's tree actions. Only valid below `TreeActionsProvider`. */
export function useTreeActions(): TreeActions {
  const actions = useContext(TreeActionsContext)
  if (!actions) throw new Error('useTreeActions must be used inside <TreeActionsProvider>')
  return actions
}
