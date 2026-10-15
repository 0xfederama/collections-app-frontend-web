import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { overlayClasses } from './Dialog'
import { IconButton } from './IconButton'
import { X } from './icons'
import { useReturnFocus } from './returnFocus'

export interface DrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title: string
  description?: string
  side?: 'left' | 'right'
  children?: ReactNode
}

/** Edge-anchored panel (mobile sidebar, history). Slides in; reduced motion removes the slide. */
export function Drawer({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  side = 'right',
  children,
}: DrawerProps) {
  const returnFocus = useReturnFocus()
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClasses} />
        <RadixDialog.Content
          onOpenAutoFocus={returnFocus.capture}
          onCloseAutoFocus={returnFocus.restore}
          className={cx(
            'fixed inset-y-0 z-50 flex w-[min(24rem,100%-3rem)] flex-col gap-4 material-strong overflow-y-auto p-6 text-text shadow-sheet',
            side === 'right'
              ? 'right-0 rounded-l-xl data-[state=closed]:animate-drawer-out-right data-[state=open]:animate-drawer-in-right'
              : 'left-0 rounded-r-xl data-[state=closed]:animate-drawer-out-left data-[state=open]:animate-drawer-in-left',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="text-xl font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-sm text-text-muted">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <IconButton aria-label="Close" className="-mt-2 -mr-2">
                <X aria-hidden />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
