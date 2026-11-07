import { useEffect, useState } from 'react'
import { cx } from '../lib/cx'

/**
 * Phones only (D-140, D-141). iOS 26+ (Safari tabs and the home-screen app) blurs the page under the
 * status bar unless a fixed element with a plain background touches the top edge; then it paints
 * the bar in that colour. At the top of the page the title sits right under the status bar, so the
 * bar is solid there; once the page scrolls, the cover goes (`display: none`, which Safari does not
 * sample) and the system blur over the scrolling content comes back.
 */
export function StatusBarCover() {
  const [atTop, setAtTop] = useState(true)
  useEffect(() => {
    const update = () => setAtTop(window.scrollY <= 4)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return (
    <div
      aria-hidden="true"
      className={cx(
        'fixed inset-x-0 top-0 z-40 h-[max(0.75rem,env(safe-area-inset-top))] bg-bg',
        !atTop && 'hidden',
      )}
    />
  )
}
