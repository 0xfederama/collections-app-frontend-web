import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { IconButton, focusRing } from '../../components/ui'
import {
  ChevronRight,
  Plus,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from '../../components/ui/icons'
import { useQuickAdd } from '../quickadd'
import { useWorkspaceName } from '../settings'
import { SidebarTree } from '../tree'
import { RecentItems } from './RecentItems'

/** Same square as the page header buttons on phones (44 px on touch). */
const headerButton = 'pointer-coarse:size-11'

/**
 * Phones (< 768 px, F-025 W14): Home is the root page, there is no drawer. Header row (workspace
 * name, Search, Quick add), recently updated items, the folders and lists (the sidebar tree, so
 * expand, row actions and "+ New" are the same), then Settings and Trash as plain rows.
 */
export function MobileHome({ empty }: { empty: ReactNode }) {
  const workspaceName = useWorkspaceName()
  const quickAdd = useQuickAdd()
  const here = useLocation()
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2">
        <h1 className="min-w-0 flex-1 truncate font-display text-display">{workspaceName}</h1>
        <Link
          to="/search"
          aria-label="Search"
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text hover:bg-fill-hover ${headerButton} ${focusRing}`}
        >
          <Search aria-hidden className="size-5" />
        </Link>
        <IconButton aria-label="Quick add" onClick={() => quickAdd.open()} className={headerButton}>
          <Plus aria-hidden />
        </IconButton>
      </div>
      {!empty && <RecentItems />}
      <section aria-labelledby="home-library" className="flex flex-col gap-3">
        <h2 id="home-library" className="font-display text-section text-text">
          Lists
        </h2>
        {empty ?? <SidebarTree />}
      </section>
      <nav
        aria-label="Settings and Trash"
        className="flex flex-col divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-surface"
      >
        <Row to="/settings" label="Settings" icon={Settings} state={{ background: here }} />
        <Row to="/trash" label="Trash" icon={Trash2} />
      </nav>
    </div>
  )
}

function Row({
  to,
  label,
  icon: Icon,
  state,
}: {
  to: string
  label: string
  icon: LucideIcon
  state?: unknown
}) {
  return (
    <Link
      to={to}
      state={state}
      className={`flex min-h-11 items-center gap-3 px-3 text-ui text-text hover:bg-fill-hover focus-visible:-outline-offset-2 ${focusRing}`}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-text-muted" />
      <span className="flex-1">{label}</span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-text-subtle" />
    </Link>
  )
}
