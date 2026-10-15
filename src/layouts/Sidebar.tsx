import type { Ref } from 'react'
import { Link, NavLink } from 'react-router'
import { IconButton, Tooltip } from '../components/ui'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from '../components/ui/icons'
import { useQuickAdd } from '../features/quickadd/QuickAddContext'
import { SidebarSearch } from '../features/search/SidebarSearch'
import { useWorkspaceName } from '../features/settings/api'
import { SidebarTree } from '../features/tree/SidebarTree'
import { cx } from '../lib/cx'
import { ThemeToggle } from './ThemeToggle'

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

/** Sidebar content (landmark `nav`): workspace, search, tree, then Trash, Settings and the theme toggle. */
export function Sidebar({
  rail = false,
  showHeader = true,
  onToggleRail,
  onRevealSearch,
  searchRef,
}: SidebarProps) {
  const workspaceName = useWorkspaceName()
  const quickAdd = useQuickAdd()

  return (
    <nav
      aria-label="Library"
      className={cx('flex min-h-0 flex-1 flex-col gap-3', rail ? 'items-center p-2' : 'p-3 pt-4')}
    >
      {/* Same element in both modes, so the toggle keeps keyboard focus when it flips. */}
      <div className={cx('flex items-center gap-2', rail ? 'flex-col' : 'justify-between pl-1')}>
        {showHeader && !rail && (
          <Link to="/" className="min-w-0 truncate text-[15px] font-semibold tracking-tight">
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
        <Tooltip content="Quick add (N)" side="right">
          <IconButton aria-label="Quick add" onClick={() => quickAdd.open()}>
            <Plus aria-hidden />
          </IconButton>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => quickAdd.open()}
          className="flex min-h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg shadow-accent hover:bg-accent-hover pointer-coarse:min-h-11"
        >
          <Plus aria-hidden className="size-4 shrink-0" />
          Quick add
          <kbd className="ml-auto text-xs opacity-80">N</kbd>
        </button>
      )}

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
        <div className={cx(!rail && 'px-2 pt-1')}>
          <ThemeToggle rail={rail} />
        </div>
      </div>
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
        'flex min-h-9 items-center gap-2 rounded-md text-sm text-text hover:bg-fill-hover aria-[current=page]:bg-accent/10 aria-[current=page]:font-medium pointer-coarse:min-h-11',
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
