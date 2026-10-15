import * as RadixAlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { overlayClasses } from './Dialog'
import { useReturnFocus } from './returnFocus'

export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  /** Destructive confirm (red). Focus still starts on Cancel. */
  destructive?: boolean
  pending?: boolean
  /** Extra content under the description, e.g. an error message. */
  children?: ReactNode
  /** Do not close on confirm: the caller closes `open` itself once the action succeeded. */
  keepOpen?: boolean
}

/** Confirmation that needs an explicit answer: no outside-click dismissal, no close icon. */
export function AlertDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive,
  pending,
  children,
  keepOpen,
}: AlertDialogProps) {
  const returnFocus = useReturnFocus()
  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixAlertDialog.Trigger asChild>{trigger}</RadixAlertDialog.Trigger>}
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className={overlayClasses} />
        <RadixAlertDialog.Content
          onOpenAutoFocus={returnFocus.capture}
          onCloseAutoFocus={returnFocus.restore}
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 material-strong rounded-xl p-6 text-text shadow-sheet data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in"
        >
          <div className="flex flex-col gap-1">
            <RadixAlertDialog.Title className="text-xl font-semibold">
              {title}
            </RadixAlertDialog.Title>
            <RadixAlertDialog.Description className="text-sm text-text-muted">
              {description}
            </RadixAlertDialog.Description>
          </div>
          {children}
          <div className="flex flex-wrap justify-end gap-2">
            <RadixAlertDialog.Cancel asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                pending={pending}
                onClick={(event) => {
                  if (keepOpen) event.preventDefault()
                  onConfirm()
                }}
              >
                {confirmLabel}
              </Button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  )
}
