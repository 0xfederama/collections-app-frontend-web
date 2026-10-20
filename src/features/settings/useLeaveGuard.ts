import { useEffect } from 'react'
import { useBlocker } from 'react-router'

/**
 * Blocks leaving the settings page with unsaved changes (router navigation and closing the tab).
 * `allowLeave` is set by the form once a leave is intended (saved and closing, or discarding).
 * Returns the router blocker so the caller can show its confirm dialog.
 */
export function useLeaveGuard(dirty: boolean, allowLeave: { current: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowLeave.current) return false
    if (!dirty) return false
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    )
  })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      if (allowLeave.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, allowLeave])
  return blocker
}
