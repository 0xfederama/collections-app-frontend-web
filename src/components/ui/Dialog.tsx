import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode, RefObject } from 'react'
import { cx } from '../../lib/cx'
import { handOffKeyboardFocus } from '../../lib/keyboardProxy'
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
  /** Keeps the title and description for assistive tech only (a quiet dialog whose content speaks for itself). */
  hideTitle?: boolean
  /** Runs as the dialog closes; call `event.preventDefault()` to take over where focus goes next. */
  onCloseAutoFocus?: (event: Event) => void
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
  hideTitle = false,
  onCloseAutoFocus,
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
            // Takes focus over from the iOS keyboard proxy, if the opening tap left one.
            handOffKeyboardFocus(initialFocus.current)
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event)
            if (!event.defaultPrevented) returnFocus.restore(event)
          }}
          className={cx(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto material-strong rounded-xl p-6 text-text shadow-sheet data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in',
            className,
          )}
        >
          <div
            className={cx(
              'flex items-start justify-between gap-4',
              hideTitle && 'absolute top-3 right-3',
            )}
          >
            <div className={cx('flex flex-col gap-1', hideTitle && 'sr-only')}>
              <RadixDialog.Title className="font-display text-section">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-ui text-text-muted">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <IconButton aria-label="Close" className={hideTitle ? undefined : '-mt-2 -mr-2'}>
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
