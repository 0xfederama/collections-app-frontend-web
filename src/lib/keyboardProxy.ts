import { focusNote } from './focusDebug'

/**
 * How long a proxy waits for the real field to take focus before it is removed anyway. Long enough
 * for a first visit that still has to load the page's code over a slow network (roadmap 28).
 */
export const KEYBOARD_PROXY_MS = 10000

let proxy: HTMLInputElement | null = null
let opener: HTMLElement | null = null
let timer: number | undefined

/**
 * iOS Safari (and the home-screen web app) opens the on-screen keyboard only for a `focus()` that
 * runs synchronously inside the user's tap. A field that mounts after the tap (the new-item title
 * behind a route change, the Quick add title inside a dialog) cannot open it, so the tap handler
 * focuses a hidden proxy input first. Once the real field mounts it calls `handOffKeyboardFocus()`:
 * focus moves from one input to the other, which keeps the keyboard open, and only then is the
 * proxy removed. Call this from the tap handler itself, before any `await` or state update.
 */
export function focusKeyboardProxy(): void {
  const active = document.activeElement
  const previous = proxy
  if (active instanceof HTMLElement && active !== document.body && active !== previous) {
    opener = active
  } else if (!previous) {
    opener = null
  }
  const input = document.createElement('input')
  input.type = 'text'
  input.tabIndex = -1
  input.dataset.keyboardProxy = ''
  input.setAttribute('aria-hidden', 'true')
  input.setAttribute('autocomplete', 'off')
  // Offscreen and invisible, but rendered: iOS will not open a keyboard for a display:none input.
  // 16px text: iOS zooms the page when it focuses an input with smaller text.
  input.className =
    'pointer-events-none fixed top-0 left-0 size-px overflow-hidden text-base opacity-0'
  document.body.append(input)
  // Focus the new proxy before removing the old one, so focus never falls to <body> in between
  // (that would close the keyboard). No scroll: the page must not jump to the top.
  input.focus({ preventScroll: true })
  focusNote(`proxy focus: ${document.activeElement === input ? 'ok' : 'REFUSED'}`)
  window.clearTimeout(timer)
  previous?.remove()
  proxy = input
  timer = window.setTimeout(releaseKeyboardProxy, KEYBOARD_PROXY_MS)
}

/**
 * Moves focus to the real field that just mounted and removes the proxy, in that order. Without a
 * field, the proxy is kept (and still times out). Safe to call with no proxy waiting: it then only
 * focuses the field, which is what desktop needs.
 */
export function handOffKeyboardFocus(field: HTMLElement | null | undefined): void {
  if (!field) return
  if (document.activeElement !== field) field.focus({ preventScroll: true })
  focusNote(
    `hand-off: ${document.activeElement === field ? 'ok' : 'FAILED'} (proxy ${proxy ? 'waiting' : 'none'})`,
  )
  if (document.activeElement === field) releaseKeyboardProxy()
}

/** The element that had focus before the proxy took it (a dialog returns focus there). */
export function keyboardProxyOpener(): HTMLElement | null {
  return proxy && document.activeElement === proxy ? opener : null
}

/** True while a proxy holds the keyboard open, waiting for its field. */
export function keyboardProxyWaiting(): boolean {
  return proxy !== null && document.activeElement === proxy
}

/**
 * Ref callback for a field that must take the keyboard over whenever it mounts, however late (a
 * lazy route, a dialog body that renders after data loads). One-shot effects miss a field that
 * appears after them; a ref callback runs exactly when the element is attached.
 */
export function handOffWhenMounted(field: HTMLElement | null): void {
  if (field && keyboardProxyWaiting()) handOffKeyboardFocus(field)
}

/** True for the proxy input itself. */
export function isKeyboardProxy(element: Element | null): boolean {
  return element !== null && element === proxy
}

/** Removes the proxy, if one is waiting. Safe to call at any time. */
export function releaseKeyboardProxy(): void {
  if (proxy) focusNote(timer === undefined ? 'proxy released' : 'proxy released (or timed out)')
  window.clearTimeout(timer)
  timer = undefined
  proxy?.remove()
  proxy = null
  opener = null
}
