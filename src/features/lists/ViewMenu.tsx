import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { menuItemClass } from '../../components/ui'
import { Check, LayoutGrid, List as ListIcon, Rows3 } from '../../components/ui/icons'
import type { DisplayMode } from './api'
import { toolbarIconControl } from './toolbarStyles'

interface ModeEntry {
  value: DisplayMode
  label: string
  Icon: typeof ListIcon
}

const modes: [ModeEntry, ...ModeEntry[]] = [
  { value: 'compact', label: 'Compact rows', Icon: ListIcon },
  { value: 'thumbnail', label: 'Thumbnail rows', Icon: Rows3 },
  { value: 'grid', label: 'Grid', Icon: LayoutGrid },
]

/**
 * "View options" (F-025): one icon button showing the current display mode, whose menu lists the
 * three modes as radio items. Like `SortMenu`, so the toolbar reads as one set of equal buttons.
 */
export function ViewMenu({
  value,
  onValueChange,
}: {
  value: DisplayMode
  onValueChange: (mode: DisplayMode) => void
}) {
  const Current = (modes.find((mode) => mode.value === value) ?? modes[0]).Icon
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={toolbarIconControl}>
          <Current aria-hidden className="size-4" />
          <span className="sr-only">View options</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="bg-surface-raised z-50 min-w-48 rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={(next) => onValueChange(next as DisplayMode)}
          >
            {modes.map(({ value: mode, label, Icon }) => (
              <DropdownMenu.RadioItem key={mode} value={mode} className={menuItemClass}>
                <span aria-hidden className="grid size-4 shrink-0 place-items-center">
                  <DropdownMenu.ItemIndicator>
                    <Check />
                  </DropdownMenu.ItemIndicator>
                </span>
                <Icon aria-hidden className="size-4" />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
