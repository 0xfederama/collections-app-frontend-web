import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { Drawer, IconButton } from '../components/ui'
import { MenuIcon, X } from '../components/ui/icons'
import { useSearchShortcut } from '../features/search/useSearchShortcut'
import { useWorkspaceName } from '../features/settings/api'
import { useBreakpoint } from '../lib/breakpoints'
import { ItemRoute } from '../routes/ItemRoute'
import { Sidebar } from './Sidebar'
import { SidebarResizer } from './SidebarResizer'
import { useSidebarState } from './useSidebarState'

const SIDEBAR_ID = 'app-sidebar'
const RAIL_WIDTH = 64

/**
 * Responsive frame (UI_SPEC §2): drawer below 768 px, collapsible rail 768–1023, resizable
 * sidebar from 1024, and a detail panel from 1280. Routes render in `main`; the item route
 * renders in `main` (full page) below 1280 and in the panel beside the list at ≥ 1280.
 */
export function AppShell() {
  const breakpoint = useBreakpoint()
  const sidebar = useSidebarState()
  const { setCollapsed } = sidebar
  const location = useLocation()
  const workspaceName = useWorkspaceName()

  // The drawer is open for the location it was opened at, so any navigation closes it.
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const drawerOpen = drawerAt === location.key

  const searchRef = useRef<HTMLInputElement>(null)
  const focusSearchWhenMounted = useRef(false)
  useEffect(() => {
    if (focusSearchWhenMounted.current && searchRef.current) {
      focusSearchWhenMounted.current = false
      searchRef.current.focus()
    }
  })
  const revealSearch = useCallback(() => {
    if (searchRef.current) {
      searchRef.current.focus()
    } else if (breakpoint === 'mobile') {
      setDrawerAt(location.key)
    } else {
      // Tablet icon rail: open the full sidebar, then focus the field once it exists.
      focusSearchWhenMounted.current = true
      setCollapsed(false)
    }
  }, [breakpoint, location.key, setCollapsed])
  useSearchShortcut(revealSearch)

  const itemMatch = useMatch('/lists/:listId/items/:itemId')
  const panelVisible = breakpoint === 'wide' && itemMatch !== null
  const content = itemMatch !== null && breakpoint !== 'wide' ? <ItemRoute /> : <Outlet />

  if (breakpoint === 'mobile') {
    return (
      <div className="flex h-dvh flex-col bg-bg text-text">
        <header className="flex items-center gap-1 border-b border-border bg-surface px-2 py-1">
          <Drawer
            side="left"
            open={drawerOpen}
            onOpenChange={(open) => setDrawerAt(open ? location.key : null)}
            title={workspaceName}
            trigger={
              <IconButton aria-label="Open menu">
                <MenuIcon aria-hidden />
              </IconButton>
            }
          >
            <Sidebar showHeader={false} />
          </Drawer>
          <Link to="/" className="min-w-0 flex-1 truncate font-display text-lg font-semibold">
            {workspaceName}
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4">{content}</main>
      </div>
    )
  }

  const rail = breakpoint === 'tablet' && sidebar.collapsed
  const resizable = breakpoint === 'desktop' || breakpoint === 'wide'

  return (
    <div className="flex h-dvh bg-bg text-text">
      <div
        id={SIDEBAR_ID}
        style={{ width: rail ? RAIL_WIDTH : sidebar.width }}
        className="flex shrink-0 flex-col bg-surface"
      >
        <Sidebar
          rail={rail}
          onToggleRail={
            breakpoint === 'tablet' ? () => sidebar.setCollapsed(!sidebar.collapsed) : undefined
          }
          onRevealSearch={revealSearch}
          searchRef={searchRef}
        />
      </div>
      {resizable ? (
        <SidebarResizer
          width={sidebar.width}
          onWidthChange={sidebar.setWidth}
          controls={SIDEBAR_ID}
        />
      ) : (
        <div aria-hidden className="w-px shrink-0 bg-border" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="min-w-0 flex-1 overflow-y-auto p-6">{content}</main>
          {panelVisible && (
            <DetailPanel listId={itemMatch.params.listId} search={location.search} />
          )}
        </div>
      </div>
    </div>
  )
}

/** Wide screens: the item beside the list. W-07 changes `ItemRoute`, not this frame. */
function DetailPanel({ listId, search }: { listId: string | undefined; search: string }) {
  const navigate = useNavigate()
  return (
    <aside
      aria-label="Item details"
      className="flex w-[40%] max-w-[40rem] min-w-[26.25rem] shrink-0 animate-drawer-in-right flex-col overflow-y-auto border-l border-border bg-surface"
    >
      <div className="flex justify-end px-2 pt-2">
        <IconButton
          aria-label="Close details"
          onClick={() => void navigate({ pathname: `/lists/${listId}`, search })}
        >
          <X aria-hidden />
        </IconButton>
      </div>
      <div className="px-6 pb-6">
        <ItemRoute />
      </div>
    </aside>
  )
}
