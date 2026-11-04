import { Link, type To } from 'react-router'
import { useBreakpoint } from '../lib/breakpoints'
import { focusRing } from './ui'
import { ArrowLeft } from './ui/icons'

/** Same square as the toolbar icon buttons (36 px, 44 px on touch), see `lists/toolbarStyles.ts`. */
const slotClass = `inline-flex size-9 shrink-0 select-none items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-fill-hover pointer-coarse:size-11 [&_svg]:size-5 ${focusRing}`

/**
 * The back control of a sub-page's header row on phones (the item page, back to its list). It renders
 * nothing from 768 px. Top pages (lists, Search, Trash) have no leading slot: the title starts at the
 * left edge. Put it first in the row that holds the title, in loading and error states too.
 */
export function PageHeaderSlot({ back }: { back: { to: To; label: string } }) {
  return useBreakpoint() === 'mobile' ? (
    <Link to={back.to} aria-label={back.label} title={back.label} className={slotClass}>
      <ArrowLeft aria-hidden />
    </Link>
  ) : null
}
