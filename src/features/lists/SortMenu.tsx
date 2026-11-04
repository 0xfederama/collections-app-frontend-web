import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { menuItemClass, type SelectOption } from '../../components/ui'
import { ArrowUpDown, Check } from '../../components/ui/icons'
import { toolbarIconControl } from './toolbarStyles'

export interface SortMenuProps {
  options: SelectOption[]
  value: string
  onValueChange: (value: string) => void
}

/**
 * "Sort" as an icon button like "Filter" (F-025 W8). The menu lists the sort choices as radio items,
 * so the active one is checked and stays visible without showing its name on the button.
 */
export function SortMenu({ options, value, onValueChange }: SortMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={toolbarIconControl}>
          <ArrowUpDown aria-hidden className="size-4" />
          <span className="sr-only">Sort</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="bg-surface-raised z-50 min-w-48 rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className={menuItemClass}
              >
                <span aria-hidden className="grid size-4 shrink-0 place-items-center">
                  <DropdownMenu.ItemIndicator>
                    <Check />
                  </DropdownMenu.ItemIndicator>
                </span>
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
