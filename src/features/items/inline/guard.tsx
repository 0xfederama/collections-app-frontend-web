import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useBlocker } from 'react-router'
import { AlertDialog } from '../../../components/ui'

interface Guard {
  /** An open editor reports whether it holds unsaved changes. */
  setDirty: (id: string, dirty: boolean) => void
  /** Leaving on purpose (Move, Delete) must not ask. */
  allowLeave: () => void
}

const none: Guard = { setDirty: () => undefined, allowLeave: () => undefined }
const GuardContext = createContext<Guard>(none)

/** For the field editors, the description and the Move / Delete dialogs. Safe without a provider. */
export const useEditGuard = () => useContext(GuardContext)

/**
 * AT-22: leaving the item (another item or list, the back button, closing the tab) while any
 * field editor or the description holds unsaved changes asks first. Staying on this item (the list
 * filter changing `?q=`) is fine. The dialog is the old "Discard changes?"; there is no Save in it,
 * the editors keep their own ✓.
 */
export function EditGuardProvider({ children }: { children: ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set())
  const dirty = dirtyIds.size > 0
  const allow = useRef(false)

  const setDirty = useCallback((id: string, value: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === value) return current
      const next = new Set(current)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const allowLeave = useCallback(() => {
    allow.current = true
  }, [])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allow.current && nextLocation.pathname !== currentLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const value = useMemo(() => ({ setDirty, allowLeave }), [setDirty, allowLeave])
  return (
    <GuardContext.Provider value={value}>
      {children}
      {blocker.state === 'blocked' && (
        <AlertDialog
          open
          title="Discard changes?"
          description="You have unsaved changes to this item. If you leave now, they are lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          destructive
          keepOpen
          onOpenChange={(open) => {
            if (!open) blocker.reset()
          }}
          onConfirm={() => {
            allow.current = true
            blocker.proceed()
          }}
        />
      )}
    </GuardContext.Provider>
  )
}
