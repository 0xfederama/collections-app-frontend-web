import { useEffect } from 'react'
import { Link, useLocation, useNavigate, type To } from 'react-router'
import { useBreakpoint } from '../lib/breakpoints'
import { focusRing } from './ui'
import { ArrowLeft, ChevronLeft } from './ui/icons'

/** Same square as the toolbar icon buttons (36 px, 44 px on touch), see `lists/toolbarStyles.ts`. */
const slotClass = `inline-flex size-9 shrink-0 select-none items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-fill-hover pointer-coarse:size-11 [&_svg]:size-5 ${focusRing}`
const homeClass = `-ml-1 inline-flex h-9 shrink-0 select-none items-center gap-0.5 rounded-md pr-2 text-ui text-accent-text transition-colors hover:bg-fill-hover pointer-coarse:h-11 [&_svg]:size-5 ${focusRing}`

/**
 * Pathname of every history entry visited in this session, by the router's `history.state.idx`.
 * It lets "‹ Home" go back (`navigate(-1)`) when Home is the previous entry, so the history does not
 * grow a Home entry on every round trip and the browser's back / iOS edge swipe keep agreeing with
 * the control. Without a browser history (tests, memory router) there is no index and it links.
 */
const visited = new Map<number, string>()
const historyIndex = (): number | null => {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx
  return typeof idx === 'number' ? idx : null
}

/** Called once by the shell: records the current entry's path. */
export function useRecordHistory() {
  const { pathname, key } = useLocation()
  useEffect(() => {
    const idx = historyIndex()
    if (idx !== null) visited.set(idx, pathname)
  }, [pathname, key])
}

const cameFromHome = () => {
  const idx = historyIndex()
  return idx !== null && idx > 0 && visited.get(idx - 1) === '/'
}

/**
 * The one leading slot of a page's own header row on phones: sub-pages pass `back` (the item page,
 * back to its list), every other page shows "‹ Home" (F-025 W14; Home is the root, there is no
 * drawer). It renders nothing from 768 px, so the title starts at the left edge there, and Home
 * itself does not render it. Put it first in the row that holds the title, in loading and error
 * states too, so the title never shifts.
 */
export function PageHeaderSlot({ back }: { back?: { to: To; label: string } }) {
  return useBreakpoint() === 'mobile' ? <Slot back={back} /> : null
}

function Slot({ back }: { back?: { to: To; label: string } }) {
  const navigate = useNavigate()
  if (back) {
    return (
      <Link to={back.to} aria-label={back.label} title={back.label} className={slotClass}>
        <ArrowLeft aria-hidden />
      </Link>
    )
  }
  return (
    <Link
      to="/"
      aria-label="Back to Home"
      className={homeClass}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
        if (!cameFromHome()) return
        event.preventDefault()
        void navigate(-1)
      }}
    >
      <ChevronLeft aria-hidden />
      Home
    </Link>
  )
}
