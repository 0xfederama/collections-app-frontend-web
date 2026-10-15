import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useRef, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { rememberMenuTrigger } from './returnFocus'

export type MenuItem =
  | {
      type?: 'item'
      label: string
      onSelect: () => void
      icon?: ReactNode
      destructive?: boolean
      disabled?: boolean
    }
  | { type: 'separator' }

export interface MenuProps {
  /** The element that opens the menu (rendered with asChild, so pass a Button or IconButton). */
  trigger: ReactNode
  items: MenuItem[]
  align?: 'start' | 'center' | 'end'
}

export function Menu({ trigger, items, align = 'end' }: MenuProps) {
  const opener = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild ref={opener}>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-48 rounded-md border border-border bg-surface-raised p-1 text-text shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          {items.map((item, index) =>
            item.type === 'separator' ? (
              <DropdownMenu.Separator key={`sep-${index}`} className="my-1 h-px bg-border" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={() => {
                  rememberMenuTrigger(opener.current)
                  item.onSelect()
                }}
                className={cx(
                  'flex h-9 cursor-pointer select-none items-center gap-2 rounded-sm px-3 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-border pointer-coarse:min-h-11 [&_svg]:size-4',
                  item.destructive && 'text-danger-text data-[highlighted]:bg-danger-bg',
                )}
              >
                {item.icon && <span aria-hidden>{item.icon}</span>}
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
