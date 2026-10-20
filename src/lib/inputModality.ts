/**
 * Remembers whether the last input was the pointer or the keyboard (`data-pointer` on <html>).
 * Radix puts focus back on a menu's trigger with `focus()` after it closes, and the browser then
 * keeps `:focus-visible` on it even when the menu was used with the mouse, leaving a ring on the
 * button. `global.css` hides that ring while the pointer is the last input; a key press brings it
 * back at once, so keyboard users keep their focus ring.
 */
export function trackInputModality(root: HTMLElement = document.documentElement): () => void {
  const pointer = () => root.setAttribute('data-pointer', '')
  const keyboard = () => root.removeAttribute('data-pointer')
  document.addEventListener('pointerdown', pointer, true)
  document.addEventListener('keydown', keyboard, true)
  return () => {
    document.removeEventListener('pointerdown', pointer, true)
    document.removeEventListener('keydown', keyboard, true)
    root.removeAttribute('data-pointer')
  }
}
