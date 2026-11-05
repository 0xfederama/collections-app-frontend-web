/** How long a proxy waits for the real field to take focus before it is removed anyway. */
export const KEYBOARD_PROXY_MS = 3000

let proxy: HTMLInputElement | null = null
let timer: number | undefined

/**
 * iOS Safari opens the on-screen keyboard only for a `focus()` that runs synchronously inside the
 * user's tap. A field that mounts after the tap (the new-item title, behind a route change) cannot
 * open it, so the tap handler focuses a hidden proxy input first. The real field then takes focus,
 * and focus moving from one input to another keeps the keyboard open; `releaseKeyboardProxy()`
 * removes the proxy once that has happened. Call it from the tap handler itself, before any `await`.
 */
export function focusKeyboardProxy(): void {
  releaseKeyboardProxy()
  const input = document.createElement('input')
  input.type = 'text'
  input.tabIndex = -1
  input.setAttribute('aria-hidden', 'true')
  input.setAttribute('autocomplete', 'off')
  // Offscreen and invisible, but rendered: iOS will not open a keyboard for a display:none input.
  input.className = 'pointer-events-none fixed top-0 left-0 size-px overflow-hidden opacity-0'
  document.body.append(input)
  // No scroll: the proxy must not pull the page to the top of the document.
  input.focus({ preventScroll: true })
  proxy = input
  timer = window.setTimeout(releaseKeyboardProxy, KEYBOARD_PROXY_MS)
}

/** Removes the proxy, if one is waiting. Safe to call at any time. */
export function releaseKeyboardProxy(): void {
  window.clearTimeout(timer)
  timer = undefined
  proxy?.remove()
  proxy = null
}
