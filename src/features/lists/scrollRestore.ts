import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router'

/**
 * Scroll position of the app's scroll container (`main`, see AppShell) per history entry. A module
 * Map is enough: it only has to survive the list unmounting while an item is open (below 1280 px),
 * and a page reload starts from the top anyway.
 */
const positions = new Map<string, number>()

/**
 * Restores the scroll position when the user comes back to a list (UI_SPEC §1). React Router's
 * `<ScrollRestoration>` only handles the window, and here `main` scrolls instead.
 *
 * `anchor` is any element inside `main`. Restoring waits for `ready` (the items are rendered, so
 * the page is tall enough); a visit with no saved position starts at the top, because `main` is
 * shared by every route. Positions are keyed by `location.key`, so only back/forward restores, not
 * a fresh click on the same list. Returns `remember`, to call right before navigating away.
 */
export function useScrollRestore(anchor: RefObject<HTMLElement | null>, ready: boolean) {
  const { key } = useLocation()
  const currentKey = useRef(key)
  const mountKey = useRef(key)
  const restored = useRef(false)
  useLayoutEffect(() => {
    currentKey.current = key
  })

  const remember = () => {
    const container = anchor.current?.closest('main')
    if (container) positions.set(currentKey.current, container.scrollTop)
  }

  useLayoutEffect(() => {
    if (!ready) return
    const container = anchor.current?.closest('main')
    if (!container) return
    if (!restored.current) {
      restored.current = true
      container.scrollTop = positions.get(mountKey.current) ?? 0
    }
    // Listening only starts now, so the clamped scroll of a page still loading cannot overwrite the saved value.
    const save = () => positions.set(currentKey.current, container.scrollTop)
    container.addEventListener('scroll', save, { passive: true })
    return () => container.removeEventListener('scroll', save)
  }, [anchor, ready])

  return remember
}
