import type { ReactNode, Ref } from 'react'
import { Button } from '../components/ui'
import { Plus } from '../components/ui/icons'
import { useQuickAdd } from '../features/quickadd/QuickAddContext'
import { SidebarSearch } from '../features/search/SidebarSearch'
import { ThemeToggle } from './ThemeToggle'

export interface TopBarProps {
  /** Mobile: the drawer trigger, placed first. */
  leading?: ReactNode
  searchRef?: Ref<HTMLInputElement>
}

/**
 * The one top bar of the shell (F008-W1, landmark `banner`): search takes the free width, a compact
 * Quick add button sits next to it and the theme selector is at the far right. It stays one row
 * down to 375 px: the search shrinks and Quick add shows only its icon (below `sm`).
 */
export function TopBar({ leading, searchRef }: TopBarProps) {
  const quickAdd = useQuickAdd()
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border material px-3 py-1.5">
      {leading}
      <div className="min-w-0 flex-1">
        <SidebarSearch inputRef={searchRef} />
      </div>
      <Button
        size="sm"
        aria-label="Quick add"
        onClick={() => quickAdd.open()}
        className="shrink-0 max-sm:size-11 max-sm:px-0"
      >
        <Plus aria-hidden className="size-4 shrink-0" />
        <span className="max-sm:sr-only">Quick add</span>
        <kbd aria-hidden className="text-xs opacity-80 max-sm:hidden">
          N
        </kbd>
      </Button>
      <ThemeToggle />
    </header>
  )
}
