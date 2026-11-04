import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

/** Hold time (ms) before a touch or pen press counts as a long press. */
const LONG_PRESS_DELAY = 500
/** Finger drift (px) still counted as "holding still". Beyond it the press is a swipe or a drag. */
const LONG_PRESS_TOLERANCE = 8

const CONTROLS = 'button, input, select, textarea, [contenteditable="true"], [role="menuitem"]'

interface Options {
  /** Called once the finger has stayed put for `delay`. */
  onLongPress: () => void
  delay?: number
  tolerance?: number
}

/**
 * Long press on an element (touch and pen only; a mouse has the click and the "…" button).
 *
 * The press is abandoned when the finger moves past `tolerance` (a swipe scrolls, a hold-and-move
 * drags), when it is lifted early, or when the browser cancels the pointer (it took over for a
 * scroll). Movement is watched on `window`, not on the element, because a drag library may capture
 * the pointer elsewhere. After a long press fires, the click that ends the gesture and the native
 * context menu are suppressed. Spread the result on the element.
 */
export function useLongPress({
  onLongPress,
  delay = LONG_PRESS_DELAY,
  tolerance = LONG_PRESS_TOLERANCE,
}: Options) {
  const callback = useRef(onLongPress)
  useEffect(() => {
    callback.current = onLongPress
  })
  const stop = useRef<(() => void) | null>(null)
  // True from the moment the long press fires until the click that ends it is swallowed.
  const fired = useRef(false)
  // The last press was a finger or pen: only then is the native context menu ours to cancel.
  const touching = useRef(false)

  const cancel = useCallback(() => {
    stop.current?.()
    stop.current = null
  }, [])
  useEffect(() => cancel, [cancel])

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    cancel()
    fired.current = false
    touching.current = event.pointerType !== 'mouse'
    const target = event.target
    if (!touching.current || !(target instanceof Element)) return
    const control = target.closest(CONTROLS)
    if (control && control !== event.currentTarget) return
    const { clientX: x, clientY: y } = event
    const timer = setTimeout(() => {
      cancel()
      fired.current = true
      callback.current()
    }, delay)
    const move = (e: globalThis.PointerEvent) => {
      if (Math.hypot(e.clientX - x, e.clientY - y) > tolerance) cancel()
    }
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', cancel, true)
    window.addEventListener('pointercancel', cancel, true)
    stop.current = () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', cancel, true)
      window.removeEventListener('pointercancel', cancel, true)
    }
  }

  return {
    onPointerDown,
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (!fired.current) return
      fired.current = false
      event.preventDefault()
      event.stopPropagation()
    },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      // Android sends it at about the same time as our timer; a mouse keeps its browser menu.
      if (touching.current) event.preventDefault()
    },
  }
}
