import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button, focusRing } from '../../components/ui'
import {
  ChevronRight,
  Plus,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from '../../components/ui/icons'
import { useQuickAdd } from '../quickadd'
import { normalizeQuery } from '../search'
import { useWorkspaceName } from '../settings'
import { SidebarTree } from '../tree'
import { RecentItems } from './RecentItems'

/** Phone "Recently updated" is capped; there is no page that lists more. */
const MOBILE_RECENT_LIMIT = 5

/**
 * Phones (< 768 px, F-025 W14): Home is the root page, there is no drawer. The iOS large-title
 * pattern: a compact top bar with a labelled Quick add button, the workspace name as a large title
 * that wraps (never truncated), a full-width search field (Enter opens `/search?q=`), then the
 * folders and lists (the sidebar tree, so expand, row actions and "+ New" are the same), recently
 * updated items, and Settings and Trash as plain rows last.
 */
export function MobileHome({ empty }: { empty: ReactNode }) {
  const workspaceName = useWorkspaceName()
  const quickAdd = useQuickAdd()
  const navigate = useNavigate()
  const here = useLocation()
  const [query, setQuery] = useState('')
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button
            variant="ink"
            size="sm"
            aria-label="Quick add"
            onClick={() => quickAdd.open()}
            className="pointer-coarse:min-h-11"
          >
            <Plus aria-hidden className="size-4 shrink-0" />
            Quick add
          </Button>
        </div>
        <h1 className="font-display text-display break-words">{workspaceName}</h1>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            const q = normalizeQuery(query)
            void navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
          }}
        >
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
            />
            <input
              type="search"
              aria-label="Search"
              placeholder="Search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`h-10 w-full rounded-md border border-border bg-surface pr-3 pl-9 text-ui text-text placeholder:text-text-muted pointer-coarse:h-11 ${focusRing}`}
            />
          </div>
        </form>
      </div>
      <section aria-labelledby="home-library" className="flex flex-col gap-3">
        <h2 id="home-library" className="font-display text-section text-text">
          Lists
        </h2>
        {empty ?? <SidebarTree />}
      </section>
      {!empty && <RecentItems limit={MOBILE_RECENT_LIMIT} />}
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
