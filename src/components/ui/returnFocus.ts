import { useRef } from 'react'
import { isKeyboardProxy, keyboardProxyOpener } from '../../lib/keyboardProxy'

/**
 * Radix returns focus on close only to its own Trigger. Dialogs opened in controlled mode
 * (a button's onClick, or a Menu item) have none, so focus would fall to <body>. `Menu` records
 * its trigger here when an item is selected, because by the time the dialog opens the focused
 * menu item is about to be unmounted.
 */
let menuTrigger: HTMLElement | null = null

export function rememberMenuTrigger(element: HTMLElement | null) {
  menuTrigger = element
  // Only valid for the dialog that this selection opens.
  setTimeout(() => {
    if (menuTrigger === element) menuTrigger = null
  }, 500)
}

function isUsable(element: Element | null): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element !== document.body &&
    element.isConnected &&
    !element.closest('[role="menu"]')
  )
}

/** Handlers for a Radix Dialog `Content`: remember the opener on open, restore it on close. */
export function useReturnFocus() {
  const target = useRef<HTMLElement | null>(null)
  return {
    capture() {
      // A tap that opened the dialog may have parked focus on the iOS keyboard proxy: return to
      // the button that was tapped instead.
      const active = isKeyboardProxy(document.activeElement)
        ? keyboardProxyOpener()
        : document.activeElement
      target.current = isUsable(active) ? active : menuTrigger
    },
    restore(event: Event) {
      const element = target.current
      target.current = null
      if (element && element.isConnected) {
        event.preventDefault()
        element.focus()
      }
    },
  }
}
