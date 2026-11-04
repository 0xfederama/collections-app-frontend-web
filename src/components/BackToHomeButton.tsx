import { useNavigate } from 'react-router'
import { useBreakpoint } from '../lib/breakpoints'
import { getPreviousPath } from '../lib/previousPath'
import { ChevronLeft } from './ui/icons'

/**
 * Phones only (< 768, F-025): a compact way back to Home at the start of a page's title row. A 44 px
 * tap target around a small bare chevron. It goes back one step only when the previous page was Home,
 * otherwise (from an item, a deep link) it opens Home.
 */
export function BackToHomeButton() {
  const phone = useBreakpoint() === 'mobile'
  const navigate = useNavigate()
  if (!phone) return null
  return (
    <button
      type="button"
      aria-label="Back to Home"
      onClick={() => void (getPreviousPath() === '/' ? navigate(-1) : navigate('/'))}
      className="-ml-3 grid size-11 shrink-0 place-items-center rounded-md text-text-muted hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
    >
      <ChevronLeft aria-hidden className="size-6" />
    </button>
  )
}
