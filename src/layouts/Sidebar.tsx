import type { Ref } from 'react'
import { Link, NavLink } from 'react-router'
import { IconButton, Tooltip } from '../components/ui'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from '../components/ui/icons'
import { BackendStatus } from '../features/health/BackendStatus'
import { SidebarSearch } from '../features/search/SidebarSearch'
import { useWorkspaceName } from '../features/settings/api'
import { SidebarTree } from '../features/tree/SidebarTree'
import { cx } from '../lib/cx'

export interface SidebarProps {
  /** Tablet icon rail: icons only, no tree. */
  rail?: boolean
  /** The drawer shows the workspace name as its own title. */
  showHeader?: boolean
  /** Tablet only: collapse / expand toggle. */
  onToggleRail?: () => void
  /** Rail only: the search icon expands the sidebar and focuses the field. */
  onRevealSearch?: () => void
  searchRef?: Ref<HTMLInputElement>
}

/** Sidebar content (landmark `nav`): workspace, search, tree, then Trash and Settings. */
export function Sidebar({
  rail = false,
  showHeader = true,
  onToggleRail,
  onRevealSearch,
  searchRef,
}: SidebarProps) {
  const workspaceName = useWorkspaceName()

  return (
    <nav
      aria-label="Collections"
      className={cx('flex min-h-0 flex-1 flex-col gap-3', rail ? 'items-center p-2' : 'p-3')}
    >
      {/* Same element in both modes, so the toggle keeps keyboard focus when it flips. */}
      <div className={cx('flex items-center gap-2', rail ? 'flex-col' : 'justify-between pl-1')}>
        {showHeader && !rail && (
          <Link to="/" className="min-w-0 truncate font-display text-lg font-semibold">
            {workspaceName}
          </Link>
        )}
        {onToggleRail && (
          <IconButton
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!rail}
            onClick={onToggleRail}
          >
            {rail ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          </IconButton>
        )}
      </div>

      {rail ? (
        <Tooltip content="Search" side="right">
          <IconButton aria-label="Search" onClick={onRevealSearch}>
            <Search aria-hidden />
          </IconButton>
        </Tooltip>
      ) : (
        <SidebarSearch inputRef={searchRef} />
      )}

      {rail ? <div className="flex-1" /> : <SidebarTree />}

      <div className={cx('flex gap-1', rail ? 'flex-col' : 'flex-col border-t border-border pt-2')}>
        <FooterLink to="/trash" label="Trash" icon={Trash2} rail={rail} />
        <FooterLink to="/settings" label="Settings" icon={Settings} rail={rail} />
      </div>
      <BackendStatus dotOnly={rail} />
    </nav>
  )
}

function FooterLink({
  to,
  label,
  icon: Icon,
  rail,
}: {
  to: string
  label: string
  icon: LucideIcon
  rail: boolean
}) {
  const link = (
    <NavLink
      to={to}
      aria-label={rail ? label : undefined}
      className={cx(
        'flex min-h-9 items-center gap-2 rounded-md text-sm text-text hover:bg-border aria-[current=page]:bg-border aria-[current=page]:font-medium pointer-coarse:min-h-11',
        rail ? 'size-11 justify-center' : 'px-2',
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-text-muted" />
      {!rail && label}
    </NavLink>
  )
  return rail ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}
