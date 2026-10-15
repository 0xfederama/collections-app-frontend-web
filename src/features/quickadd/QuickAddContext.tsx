import { createContext, useContext } from 'react'

export interface QuickAdd {
  /** Opens Quick add; `listId` preselects a destination (default: the open list, else the latest). */
  open: (listId?: string) => void
}

export const QuickAddContext = createContext<QuickAdd>({ open: () => {} })

export const useQuickAdd = () => useContext(QuickAddContext)
