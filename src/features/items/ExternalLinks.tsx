import { LinkIcon, TILE_SIZE } from '../../components/ServiceIcon'
import { focusRing } from '../../components/ui'
import { Plus } from '../../components/ui/icons'
import type { Item } from './api'
import { buildExternalLinks } from '../links'

// Every link is the same icon tile as the streaming row (F009-W5), one shared size, and the empty
// "+" slot is the same square. The visible name is the tile's tooltip; the accessible name is the
// sr-only text.
const SIZE = TILE_SIZE
const control = `inline-flex shrink-0 rounded-md ${focusRing}`

/**
 * The external links (AT-13, F-002) on one line under the title: Google, Letterboxd, IMDb for
 * movies; Google, IMDb for TV shows; Google, Goodreads, Open Library for books; Google, Reddit, Website for the rest. They wrap only when
 * there is no room. An empty website shows a "+" at the end of the row ("Add website"), which
 * asks the page to open that field's editor.
 */
export function ExternalLinks({ item, onAddWebsite }: { item: Item; onAddWebsite?: () => void }) {
  return (
    <div role="group" aria-label="External links" className="flex flex-wrap items-center gap-2">
      {buildExternalLinks(item).map((link) => {
        if (link.href === null) {
          if (link.id !== 'website' || item.website || !onAddWebsite) return null
          return (
            <button
              key={link.id}
              type="button"
              onClick={onAddWebsite}
              title="Add website"
              className={`${control} items-center justify-center rounded-md border border-dashed border-border-strong text-text-muted hover:border-accent hover:text-text`}
              style={{ width: SIZE, height: SIZE }}
            >
              <Plus aria-hidden className="size-4" />
              <span className="sr-only">Add website</span>
            </button>
          )
        }
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className={control}
          >
            <span aria-hidden>
              <LinkIcon name={link.label} size={SIZE} />
            </span>
            <span className="sr-only">{link.label} (opens in a new tab)</span>
          </a>
        )
      })}
    </div>
  )
}
