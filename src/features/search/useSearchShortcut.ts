import { useEffect } from 'react'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** Calls `onTrigger` when `/` is pressed outside a text field (UI_SPEC §2: `/` focuses search). */
export function useSearchShortcut(onTrigger: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.defaultPrevented || isTyping(event.target)) return
      event.preventDefault()
      onTrigger()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onTrigger])
}
