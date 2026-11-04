import { useLocation, useNavigate } from 'react-router'
import { useBreakpoint } from '../lib/breakpoints'
import { ChevronLeft } from './ui/icons'

/**
 * Phones only (< 768, F-025): a compact way back to Home at the start of a page's title row. A 44 px
 * tap target around a small bare chevron. It goes back one step when the previous entry is in the app,
 * and to Home when the page was opened directly (`location.key === 'default'`).
 */
export function BackToHomeButton() {
  const phone = useBreakpoint() === 'mobile'
  const navigate = useNavigate()
  const location = useLocation()
  if (!phone) return null
  return (
    <button
      type="button"
      aria-label="Back to Home"
      onClick={() => void (location.key !== 'default' ? navigate(-1) : navigate('/'))}
      className="-ml-3 grid size-11 shrink-0 place-items-center rounded-md text-text-muted hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
    >
      <ChevronLeft aria-hidden className="size-6" />
    </button>
  )
}
