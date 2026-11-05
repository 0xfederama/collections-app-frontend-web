import type { ToastOptions } from '../../components/ui'

/** "Added …" toasts replace each other (several adds in a row show only the latest) and go quickly. */
export const ADDED_TOAST = {
  kind: 'success',
  replaceKey: 'item-added',
  duration: 3000,
} as const satisfies Partial<ToastOptions>
