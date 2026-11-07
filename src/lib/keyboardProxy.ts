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
    // A tap target's hidden field (`KeyboardTapTarget`) stands for the visible button beside it:
    // focus must come back to that button, never to the field (it would raise the keyboard).
    opener =
      active.dataset.keyboardTap === undefined
        ? active
        : (active.parentElement?.querySelector<HTMLElement>('button, a') ?? null)
  } else if (!previous) {
    opener = null
  }
  const input = document.createElement('input')
  input.type = 'text'
  input.tabIndex = -1
  input.dataset.keyboardProxy = ''
  input.setAttribute('aria-hidden', 'true')
  input.setAttribute('autocomplete', 'off')
  // Draws nothing, yet is not "invisible" to WebKit: iOS takes the focus of a transparent
  // (opacity 0), clipped or display:none input but does not raise the keyboard for it (seen on an
  // iPhone with the focus diagnostics, roadmap 28). So: opacity 1 with transparent text, caret,
  // background and border, at a real 16px size. 16px text: iOS zooms the page for smaller text.
  input.className =
    'pointer-events-none fixed top-0 left-0 z-[100] m-0 size-4 appearance-none border-0 bg-transparent p-0 text-base text-transparent caret-transparent opacity-100 outline-none'
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

/** Longest wait for iOS to raise the keyboard before the focus moves on anyway. */
export const KEYBOARD_RAISE_MS = 700

let pending: HTMLElement | null = null
let pendingTimer: number | undefined
let pendingListener: (() => void) | null = null

/** True once the on-screen keyboard covers part of the layout viewport (iOS shrinks the visual one). */
function keyboardOpen(): boolean {
  const vv = window.visualViewport
  return vv !== null && vv !== undefined && window.innerHeight - vv.height > 120
}

function stopWaiting(): void {
  window.clearTimeout(pendingTimer)
  pendingTimer = undefined
  if (pendingListener) window.visualViewport?.removeEventListener('resize', pendingListener)
  pendingListener = null
  pending = null
}

function moveFocus(field: HTMLElement): void {
  if (document.activeElement !== field) field.focus({ preventScroll: true })
  focusNote(
    `hand-off: ${document.activeElement === field ? 'ok' : 'FAILED'} (proxy ${proxy ? 'waiting' : 'none'})`,
  )
  if (document.activeElement === field) releaseKeyboardProxy()
}

/**
 * Moves focus to the real field that just mounted and removes the proxy, in that order. Without a
 * field, the proxy is kept (and still times out). Safe to call with no proxy waiting: it then only
 * focuses the field, which is what desktop needs.
 *
 * Timing matters (roadmap 28, on-phone diagnostics): iOS cancels a keyboard that has not started
 * to rise when the focus moves on again. The first add worked because the draft's code was still
 * loading (the hand-off came 300 ms later); every later add handed off within 20 ms and got no
 * keyboard. So while the proxy holds the focus and the keyboard is not up yet, the hand-off waits
 * for the visual viewport to shrink (keyboard up), at most `KEYBOARD_RAISE_MS`. Without a visual
 * viewport (jsdom) there is nothing to wait for.
 */
export function handOffKeyboardFocus(field: HTMLElement | null | undefined): void {
  if (!field) return
  const vv = window.visualViewport
  if (!keyboardProxyWaiting() || !vv || keyboardOpen()) {
    stopWaiting()
    moveFocus(field)
    return
  }
  if (pending === field) return
  stopWaiting()
  pending = field
  focusNote('hand-off: waiting for the keyboard')
  const finish = () => {
    const target = pending
    stopWaiting()
    // The user may have tapped elsewhere meanwhile: only move a focus the proxy still holds.
    if (target?.isConnected && keyboardProxyWaiting()) moveFocus(target)
  }
  pendingListener = () => {
    if (keyboardOpen()) finish()
  }
  vv.addEventListener('resize', pendingListener)
  pendingTimer = window.setTimeout(finish, KEYBOARD_RAISE_MS)
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
  stopWaiting()
  if (proxy) focusNote(timer === undefined ? 'proxy released' : 'proxy released (or timed out)')
  window.clearTimeout(timer)
  timer = undefined
  proxy?.remove()
  proxy = null
  opener = null
}
