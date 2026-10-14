import { useEffect, useMemo, useState } from 'react'
import { readStored, STORAGE_KEYS, writeStored } from '../../lib/storage'
import type { TreeIndex } from './api'

const parseIds = (raw: unknown): Set<string> | undefined =>
  Array.isArray(raw) ? new Set(raw.filter((id): id is string => typeof id === 'string')) : undefined

interface State {
  expanded: Set<string>
  /** The active list whose ancestors were last opened, so a manual collapse sticks. */
  revealedFor: string | null
}

/**
 * Expanded folder ids, persisted in localStorage. Ids of folders that no longer exist are ignored
 * (and dropped on the next write). When the active list changes, its ancestors are opened once.
 */
export function useExpandedFolders(index: TreeIndex | undefined, activeListId: string | null) {
  const [state, setState] = useState<State>(() => ({
    expanded: readStored(STORAGE_KEYS.treeExpanded, parseIds, new Set<string>()),
    revealedFor: null,
  }))

  // Adjusting state while rendering (not in an effect) avoids a frame with the list hidden.
  if (index && activeListId !== state.revealedFor) {
    const next = new Set(state.expanded)
    if (activeListId) for (const folder of index.ancestorsOf(activeListId)) next.add(folder.id)
    setState({ expanded: next, revealedFor: activeListId })
  }

  const expanded = useMemo(
    () =>
      index ? new Set([...state.expanded].filter((id) => index.folders.has(id))) : state.expanded,
    [index, state.expanded],
  )

  useEffect(() => {
    // Only persist once the tree is known, otherwise valid ids would be pruned while loading.
    if (index) writeStored(STORAGE_KEYS.treeExpanded, [...expanded])
  }, [index, expanded])

  const setExpanded = (next: Set<string>) =>
    setState((current) => ({ ...current, expanded: new Set(next) }))

  return [expanded, setExpanded] as const
}
