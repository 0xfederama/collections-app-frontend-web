import { LinkIcon } from '../../components/ServiceIcon'
import { buttonBase, buttonVariantClasses } from '../../components/ui/Button'
import { ExternalLink, Plus } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { Item } from './api'
import { buildExternalLinks } from './links'

// A pill like the sketches, with the site's icon tile; the tile is hidden from assistive tech
// because the visible label already names the link.
const classes = cx(
  buttonBase,
  buttonVariantClasses.secondary,
  'h-9 gap-2 rounded-full pr-3 pl-1.5 text-sm pointer-coarse:h-11',
)

/**
 * The external links (AT-13, F-002) on their own line under the title: Google, Letterboxd, IMDb
 * for movies; Google, IMDb for TV shows; Google, Reddit, Website for the rest. An empty website
 * shows "Add website", which asks the page to open that field's editor.
 */
export function ExternalLinks({ item, onAddWebsite }: { item: Item; onAddWebsite?: () => void }) {
  return (
    <div role="group" aria-label="External links" className="flex flex-wrap gap-2">
      {buildExternalLinks(item).map((link) => {
        if (link.href === null) {
          if (link.id !== 'website' || item.website || !onAddWebsite) return null
          return (
            <button key={link.id} type="button" onClick={onAddWebsite} className={classes}>
              <span className="inline-flex size-6 items-center justify-center rounded-md border border-dashed border-border-strong text-text-muted">
                <Plus aria-hidden className="size-3.5" />
              </span>
              Add website
            </button>
          )
        }
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
          >
            <span aria-hidden>
              <LinkIcon name={link.label} size={24} />
            </span>
            {link.label}
            <ExternalLink aria-hidden className="size-3.5 text-text-muted" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )
      })}
    </div>
  )
}
