import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { Drawer, IconButton } from '../components/ui'
import { MenuIcon, X } from '../components/ui/icons'
import { QuickAddProvider } from '../features/quickadd/QuickAddProvider'
import { useSearchShortcut } from '../features/search/useSearchShortcut'
import { useWorkspaceName } from '../features/settings/api'
import { useBreakpoint } from '../lib/breakpoints'
import { ItemRoute } from '../routes/ItemRoute'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
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
  return (
    <QuickAddProvider>
      <ShellFrame />
    </QuickAddProvider>
  )
}

function ShellFrame() {
  const breakpoint = useBreakpoint()
  const sidebar = useSidebarState()
  const location = useLocation()
  const workspaceName = useWorkspaceName()

  // The drawer is open for the location it was opened at, so any navigation closes it.
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const drawerOpen = drawerAt === location.key

  const searchRef = useRef<HTMLInputElement>(null)
  const revealSearch = useCallback(() => searchRef.current?.focus(), [])
  useSearchShortcut(revealSearch)

  const itemMatch = useMatch('/lists/:listId/items/:itemId')
  const panelVisible = breakpoint === 'wide' && itemMatch !== null
  const content = itemMatch !== null && breakpoint !== 'wide' ? <ItemRoute /> : <Outlet />

  if (breakpoint === 'mobile') {
    return (
      <div className="flex h-dvh flex-col text-text">
        <TopBar
          searchRef={searchRef}
          leading={
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
          }
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4">{content}</main>
      </div>
    )
  }

  const rail = breakpoint === 'tablet' && sidebar.collapsed
  const resizable = breakpoint === 'desktop' || breakpoint === 'wide'

  return (
    <div className="flex h-dvh flex-col text-text">
      <TopBar searchRef={searchRef} />
      <div className="flex min-h-0 flex-1">
        <div
          id={SIDEBAR_ID}
          role="region"
          aria-label="Sidebar"
          style={{ width: rail ? RAIL_WIDTH : sidebar.width }}
          className="relative flex shrink-0 flex-col border-r border-border material"
        >
          <Sidebar
            rail={rail}
            onToggleRail={
              breakpoint === 'tablet' ? () => sidebar.setCollapsed(!sidebar.collapsed) : undefined
            }
          />
          {/* Inside the sidebar's region, so the separator is never outside a landmark (axe `region`). */}
          {resizable && (
            <SidebarResizer
              width={sidebar.width}
              onWidthChange={sidebar.setWidth}
              controls={SIDEBAR_ID}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main className="min-w-0 flex-1 overflow-y-auto p-6">{content}</main>
            {panelVisible && (
              <DetailPanel listId={itemMatch.params.listId} search={location.search} />
            )}
          </div>
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
      className="m-3.5 ml-0 flex w-[420px] shrink-0 animate-drawer-in-right flex-col overflow-hidden rounded-xl material-strong shadow-sheet"
    >
      <div className="flex shrink-0 justify-end px-2 pt-2">
        <IconButton
          aria-label="Close details"
          onClick={() => void navigate({ pathname: `/lists/${listId}`, search })}
        >
          <X aria-hidden />
        </IconButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        <ItemRoute />
      </div>
    </aside>
  )
}
