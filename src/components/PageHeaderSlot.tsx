import { createContext, useContext } from 'react'
import { Link, type To } from 'react-router'
import { focusRing } from './ui'
import { ArrowLeft, MenuIcon } from './ui/icons'

/**
 * Set by the shell on phones (< 768 px) only: opens the navigation drawer. `null` everywhere else,
 * which is how the slot knows there is nothing to show (F-025 W10).
 */
const MobileMenuContext = createContext<(() => void) | null>(null)
export const MobileMenuProvider = MobileMenuContext.Provider

/** Same square as the toolbar icon buttons (36 px, 44 px on touch), see `lists/toolbarStyles.ts`. */
const slotClass = `inline-flex size-9 shrink-0 select-none items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-fill-hover pointer-coarse:size-11 [&_svg]:size-5 ${focusRing}`

/**
 * The one leading slot of a page's own header row on phones: top-level pages show the menu button,
 * sub-pages pass `back` and show a back control instead (the menu is reached from the list). It
 * renders nothing from 768 px, so the title starts at the left edge there. Put it first in the row
 * that holds the title, in loading and error states too, so the title never shifts.
 */
export function PageHeaderSlot({ back }: { back?: { to: To; label: string } }) {
  const openMenu = useContext(MobileMenuContext)
  if (!openMenu) return null
  if (back) {
    return (
      <Link to={back.to} aria-label={back.label} title={back.label} className={slotClass}>
        <ArrowLeft aria-hidden />
      </Link>
    )
  }
  return (
    <button type="button" aria-label="Open menu" onClick={openMenu} className={slotClass}>
      <MenuIcon aria-hidden />
    </button>
  )
}
