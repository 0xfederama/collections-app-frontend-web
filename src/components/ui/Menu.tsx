import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useRef, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Check, ChevronRight } from './icons'
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
  | {
      /** A submenu with one choice checked (e.g. a list's kind). */
      type: 'radio-submenu'
      label: string
      value: string
      options: ({ value: string; label: string } | { separator: true })[]
      onValueChange: (value: string) => void
      icon?: ReactNode
    }
  | { type: 'separator' }

export interface MenuProps {
  /** The element that opens the menu (rendered with asChild, so pass a Button or IconButton). */
  trigger: ReactNode
  items: MenuItem[]
  align?: 'start' | 'center' | 'end'
  /** Controlled open state, for a menu that also opens another way (a long press on a row). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const itemClass =
  'flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-ui outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent-tint pointer-coarse:min-h-11 [&_svg]:size-4'

export function Menu({ trigger, items, align = 'end', open, onOpenChange }: MenuProps) {
  const opener = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild ref={opener}>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="bg-surface-raised z-50 min-w-48 rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          {items.map((item, index) =>
            item.type === 'separator' ? (
              <DropdownMenu.Separator key={`sep-${index}`} className="my-1 h-px bg-border" />
            ) : item.type === 'radio-submenu' ? (
              <DropdownMenu.Sub key={item.label}>
                <DropdownMenu.SubTrigger
                  className={cx(itemClass, 'data-[state=open]:bg-accent-tint')}
                >
                  {item.icon && <span aria-hidden>{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight aria-hidden />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={6}
                    className="bg-surface-raised z-50 min-w-40 rounded-lg p-1.5 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
                  >
                    <DropdownMenu.RadioGroup value={item.value} onValueChange={item.onValueChange}>
                      {item.options.map((option, optionIndex) =>
                        'separator' in option ? (
                          <DropdownMenu.Separator
                            key={`sep-${optionIndex}`}
                            className="my-1 h-px bg-border"
                          />
                        ) : (
                          <DropdownMenu.RadioItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => rememberMenuTrigger(opener.current)}
                            className={itemClass}
                          >
                            <span aria-hidden className="grid size-4 shrink-0 place-items-center">
                              <DropdownMenu.ItemIndicator>
                                <Check />
                              </DropdownMenu.ItemIndicator>
                            </span>
                            {option.label}
                          </DropdownMenu.RadioItem>
                        ),
                      )}
                    </DropdownMenu.RadioGroup>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            ) : (
              <DropdownMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={() => {
                  rememberMenuTrigger(opener.current)
                  item.onSelect()
                }}
                className={cx(
                  itemClass,
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
