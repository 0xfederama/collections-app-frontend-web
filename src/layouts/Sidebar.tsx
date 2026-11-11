import type { Ref } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Button, IconButton, Tooltip } from '../components/ui'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from '../components/ui/icons'
import { useQuickAdd } from '../features/quickadd'
import { SidebarSearch } from '../features/search'
import { RailTree, SidebarTree } from '../features/tree'
import { APP_NAME } from '../lib/appName'
import { cx } from '../lib/cx'

export interface SidebarProps {
  /** Collapsed icon rail: only the top-level entries, as icons. */
  rail?: boolean
  /** Collapse / expand toggle (top right of the header). */
  onToggleRail?: () => void
  /** Ref of the search input (the `/` shortcut focuses it). */
  searchRef?: Ref<HTMLInputElement>
  /** Rail only: the search icon expands the sidebar and focuses the field. */
  onSearch?: () => void
}

/**
 * Sidebar content (landmark `nav`): app name, search, Quick add, the tree, then Trash and
 * Settings. Collapsed, it is a rail with the top-level entries only.
 */
export function Sidebar({ rail = false, onToggleRail, searchRef, onSearch }: SidebarProps) {
  const quickAdd = useQuickAdd()
  const openQuickAdd = () => quickAdd.open()

  return (
    <nav
      aria-label="Library"
      className={cx('flex min-h-0 flex-1 flex-col gap-3', rail ? 'items-center p-2' : 'p-3 pt-4')}
    >
      {/* Same element in both modes, so the toggle keeps keyboard focus when it flips. */}
      {onToggleRail && (
        <div
          className={cx(
            'flex items-center gap-2',
            rail ? 'flex-col' : 'justify-between pl-1',
            !rail && 'w-full',
          )}
        >
          {!rail && (
            <Link
              to="/"
              className="flex min-w-0 items-center truncate font-display text-[1.1875rem] font-bold tracking-[-0.02em]"
            >
              <span className="min-w-0 truncate">{APP_NAME}</span>
            </Link>
          )}
          {onToggleRail && (
            <IconButton
              aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!rail}
              onClick={onToggleRail}
              className="size-8 pointer-coarse:size-11 [&_svg]:size-4"
            >
              {rail ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
            </IconButton>
          )}
        </div>
      )}

      {rail ? (
        <>
          <RailAction label="Search" icon={Search} onClick={onSearch} />
          <RailAction label="Quick add" icon={Plus} onClick={openQuickAdd} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <RailTree onOpenFolder={() => onToggleRail?.()} />
          </div>
        </>
      ) : (
        <>
          <SidebarSearch inputRef={searchRef} />
          <Button
            variant="ink"
            size="sm"
            aria-label="Quick add"
            onClick={openQuickAdd}
            className="w-full"
          >
            <Plus aria-hidden className="size-4 shrink-0" />
            Quick add
            <kbd aria-hidden className="ml-auto font-mono text-label opacity-80">
              N
            </kbd>
          </Button>
          <SidebarTree />
        </>
      )}

      <div className={cx('flex gap-1', rail ? 'flex-col' : 'flex-col border-t border-border pt-2')}>
        <FooterLink to="/trash" label="Trash" icon={Trash2} rail={rail} />
        <FooterLink to="/settings" label="Settings" icon={Settings} rail={rail} />
      </div>
    </nav>
  )
}

function RailAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: LucideIcon
  onClick?: () => void
}) {
  return (
    <Tooltip content={label} side="right">
      <IconButton aria-label={label} onClick={onClick}>
        <Icon aria-hidden />
      </IconButton>
    </Tooltip>
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
  // Settings is a pane over the current page, which it needs to know to render and to return to.
  const here = useLocation()
  const link = (
    <NavLink
      to={to}
      state={to === '/settings' && here.pathname !== to ? { background: here } : undefined}
      aria-label={rail ? label : undefined}
      className={cx(
        'flex min-h-9 items-center gap-2 rounded-md text-ui text-text hover:bg-fill-hover aria-[current=page]:bg-accent-tint aria-[current=page]:font-medium aria-[current=page]:text-accent-text pointer-coarse:min-h-11',
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
