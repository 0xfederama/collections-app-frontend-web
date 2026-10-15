import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode, RefObject } from 'react'
import { cx } from '../../lib/cx'
import { IconButton } from './IconButton'
import { X } from './icons'
import { useReturnFocus } from './returnFocus'

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Element that opens the dialog (uncontrolled use). Focus returns to it on close. */
  trigger?: ReactNode
  title: string
  description?: string
  children?: ReactNode
  /** Action row, usually Buttons. */
  footer?: ReactNode
  className?: string
  /** Element to focus when the dialog opens, instead of the first focusable one (the Close button). */
  initialFocus?: RefObject<HTMLElement | null>
}

export const overlayClasses =
  'fixed inset-0 z-40 bg-overlay data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in'

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
  initialFocus,
}: DialogProps) {
  const returnFocus = useReturnFocus()
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={overlayClasses} />
        <RadixDialog.Content
          onOpenAutoFocus={(event) => {
            returnFocus.capture()
            if (!initialFocus?.current) return
            event.preventDefault()
            initialFocus.current.focus()
          }}
          onCloseAutoFocus={returnFocus.restore}
          className={cx(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 text-text shadow-lg data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="font-display text-xl font-semibold">
                {title}
              </RadixDialog.Title>
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
          {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
