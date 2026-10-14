import * as RadixToast from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { CircleAlert, CircleCheck, Info, X } from './icons'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastOptions {
  kind?: ToastKind
  title: string
  description?: string
  /**
   * One follow-up action, e.g. "Open". The provider sits above the router, so this is a callback
   * (the caller navigates), not a `<Link>`. Running it dismisses the toast.
   */
  action?: { label: string; onAction: () => void }
}

interface ToastEntry extends ToastOptions {
  id: number
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

const kindStyles: Record<ToastKind, { box: string; Icon: typeof Info }> = {
  success: { box: 'border-success-border bg-success-bg text-success-text', Icon: CircleCheck },
  error: { box: 'border-danger-border bg-danger-bg text-danger-text', Icon: CircleAlert },
  info: { box: 'border-border bg-surface-raised text-text', Icon: Info },
}

let nextId = 0

/** Mount once near the app root. Toasts are announced by Radix's live region (errors assertively). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  const toast = useCallback((options: ToastOptions) => {
    setToasts((current) => [...current, { ...options, id: nextId++ }])
  }, [])
  const remove = (id: number) => setToasts((current) => current.filter((t) => t.id !== id))
  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider label="Notifications" swipeDirection="right">
        {children}
        {toasts.map((t) => {
          const kind = t.kind ?? 'info'
          const { box, Icon } = kindStyles[kind]
          return (
            <RadixToast.Root
              key={t.id}
              type={kind === 'error' ? 'foreground' : 'background'}
              duration={kind === 'error' ? 8000 : 5000}
              onOpenChange={(open) => !open && remove(t.id)}
              className={cx(
                'flex items-start gap-3 rounded-lg border p-3 shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-slide-in-toast',
                box,
              )}
            >
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RadixToast.Title className="text-sm font-medium">{t.title}</RadixToast.Title>
                {t.description && (
                  <RadixToast.Description className="text-sm">
                    {t.description}
                  </RadixToast.Description>
                )}
              </div>
              {t.action && (
                <RadixToast.Action asChild altText={t.action.label}>
                  <Button size="sm" variant="secondary" onClick={t.action.onAction}>
                    {t.action.label}
                  </Button>
                </RadixToast.Action>
              )}
              <RadixToast.Close asChild>
                <IconButton aria-label="Dismiss notification" className="-my-2 -mr-2 size-9">
                  <X aria-hidden />
                </IconButton>
              </RadixToast.Close>
            </RadixToast.Root>
          )
        })}
        <RadixToast.Viewport className="fixed right-0 bottom-0 z-[60] m-0 flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): (options: ToastOptions) => void {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
