import { useRef, useSyncExternalStore, type ReactNode } from 'react'
import { isTouchDevice } from '../lib/pointer'

const subscribe = () => () => {}

/**
 * Roadmap 28: iOS opens the keyboard reliably only for a tap that lands on a text field itself. A
 * `focus()` from code inside the tap (the keyboard proxy) worked for the first add and then stopped
 * (seen on an iPhone with the focus diagnostics). So on touch screens a real, invisible text field
 * lies over the button: the tap focuses it natively (keyboard up), and `onTap` then opens the
 * draft or dialog, whose title takes the focus over (input to input keeps the keyboard open).
 *
 * The field only reacts to a real press on it: a focus that arrives otherwise (a dialog returning
 * focus) is passed on to the visible button. Keyboard and screen-reader users use the button.
 */
export function KeyboardTapTarget({ children, onTap }: { children: ReactNode; onTap: () => void }) {
  const touch = useSyncExternalStore(subscribe, isTouchDevice, () => false)
  const pressed = useRef(false)
  const wrapper = useRef<HTMLSpanElement>(null)
  return (
    <span ref={wrapper} className="relative inline-flex">
      {children}
      {touch && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          data-keyboard-tap=""
          // Visible to WebKit (opacity 1) but drawing nothing; 16px text avoids the iOS focus zoom.
          className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-md border-0 bg-transparent p-0 text-base text-transparent caret-transparent outline-none"
          onPointerDown={() => {
            pressed.current = true
          }}
          onFocus={(event) => {
            if (!pressed.current) {
              wrapper.current?.querySelector<HTMLElement>('button, a')?.focus()
              return
            }
            pressed.current = false
            onTap()
            // Nothing took the focus over (no draft or dialog opened): let go of the keyboard.
            if (document.activeElement === event.currentTarget) event.currentTarget.blur()
          }}
          onChange={(event) => {
            event.currentTarget.value = ''
          }}
        />
      )}
    </span>
  )
}
