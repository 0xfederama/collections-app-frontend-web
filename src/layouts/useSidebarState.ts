import { useCallback, useEffect, useState } from 'react'
import { readStored, STORAGE_KEYS, writeStored } from '../lib/storage'

export const SIDEBAR_WIDTH = { min: 220, max: 400, default: 280 } as const

export const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, Math.round(width)))

interface SidebarState {
  /** Tablet only: icon rail instead of the full sidebar. */
  collapsed: boolean
  /** Desktop and wide: sidebar width in px. */
  width: number
}

const parseSidebar = (raw: unknown): SidebarState | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined
  const { collapsed, width } = raw as Record<string, unknown>
  return {
    collapsed: collapsed === true,
    width:
      typeof width === 'number' && Number.isFinite(width)
        ? clampSidebarWidth(width)
        : SIDEBAR_WIDTH.default,
  }
}

/** Sidebar collapsed flag and width, persisted under `collection:sidebar`. */
export function useSidebarState() {
  const [state, setState] = useState<SidebarState>(() =>
    readStored(STORAGE_KEYS.sidebar, parseSidebar, {
      collapsed: false,
      width: SIDEBAR_WIDTH.default,
    }),
  )

  useEffect(() => writeStored(STORAGE_KEYS.sidebar, state), [state])

  const setCollapsed = useCallback(
    (collapsed: boolean) => setState((s) => ({ ...s, collapsed })),
    [],
  )
  const setWidth = useCallback(
    (width: number) => setState((s) => ({ ...s, width: clampSidebarWidth(width) })),
    [],
  )

  return { ...state, setCollapsed, setWidth }
}
