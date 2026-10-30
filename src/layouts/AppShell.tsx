import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch, useNavigate, useRoutes, type Location } from 'react-router'
import { Drawer, IconButton } from '../components/ui'
import { MenuIcon, X } from '../components/ui/icons'
import { QuickAddProvider } from '../features/quickadd'
import { useSearchShortcut } from '../features/search'
import { useWorkspaceName } from '../features/settings'
import { contentRoutes } from '../app/contentRoutes'
import { useBreakpoint } from '../lib/breakpoints'
import { ItemRoute } from '../routes/ItemRoute'
import { Sidebar } from './Sidebar'
import { SidebarResizer } from './SidebarResizer'
import { useSidebarState } from './useSidebarState'

const SIDEBAR_ID = 'app-sidebar'
const RAIL_WIDTH = 64

/**
 * Responsive frame (UI_SPEC §2): no top bar. Drawer (floating menu button) below 768 px;
 * from 768 a sidebar that collapses to an icon rail at any width, resizable from 1024 while expanded,
 * and a detail panel from 1280. Routes render in `main`; the item route
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

  // The search field only exists while the sidebar is expanded (or the drawer is open). When it is
  // not there, `/` and the rail's search icon open it, and the ref callback focuses it once it mounts.
  const searchEl = useRef<HTMLInputElement | null>(null)
  const focusWhenMounted = useRef(false)
  const searchRef = useCallback((el: HTMLInputElement | null) => {
    searchEl.current = el
    if (el && focusWhenMounted.current) {
      focusWhenMounted.current = false
      el.focus()
    }
  }, [])
  const { setCollapsed } = sidebar
  const mobile = breakpoint === 'mobile'
  const locationKey = location.key
  const revealSearch = useCallback(() => {
    if (searchEl.current) return searchEl.current.focus()
    focusWhenMounted.current = true
    if (mobile) setDrawerAt(locationKey)
    else setCollapsed(false)
  }, [mobile, locationKey, setCollapsed])
  useSearchShortcut(revealSearch)

  const itemMatch = useMatch('/lists/:listId/items/:itemId')
  const panelVisible = breakpoint === 'wide' && itemMatch !== null
  // The Settings pane (`/settings`) floats over the page it was opened from: that page is rendered
  // again behind it from the location the sidebar link passed along (none on a deep link).
  const background = (location.state as { background?: Location } | null)?.background
  const behind = useRoutes(contentRoutes, background ?? location)
  const settingsOpen = location.pathname === '/settings'
  const content = settingsOpen ? (
    <>
      {background ? behind : null}
      <Outlet />
    </>
  ) : itemMatch !== null && breakpoint !== 'wide' ? (
    <ItemRoute />
  ) : (
    <Outlet />
  )

  if (mobile) {
    return (
      <div className="relative flex h-dvh flex-col text-text">
        <div className="absolute left-2 top-2 z-10 rounded-md material shadow-float">
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
            <Sidebar
              showHeader={false}
              searchRef={searchRef}
              onQuickAdd={() => setDrawerAt(null)}
            />
          </Drawer>
        </div>
        <main className="relative min-h-0 flex-1 overflow-y-auto p-4 pt-16">{content}</main>
      </div>
    )
  }

  const rail = sidebar.collapsed
  const resizable = !rail && (breakpoint === 'desktop' || breakpoint === 'wide')

  return (
    <div className="flex h-dvh text-text">
      <div className="flex min-h-0 flex-1">
        <div
          id={SIDEBAR_ID}
          role="region"
          aria-label="Sidebar"
          style={{ width: rail ? RAIL_WIDTH : sidebar.width }}
          className="relative flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar"
        >
          <Sidebar
            rail={rail}
            onToggleRail={() => setCollapsed(!sidebar.collapsed)}
            searchRef={searchRef}
            onSearch={revealSearch}
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
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-6">{content}</main>
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
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        <ItemRoute />
      </div>
    </aside>
  )
}
