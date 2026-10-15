import { buttonBase, buttonSizeClasses, buttonVariantClasses } from '../../components/ui/Button'
import { ExternalLink, Globe, MessagesSquare, Search } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import type { Item } from './api'
import { buildExternalLinks, NO_WEBSITE } from './links'

const icons = { google: Search, reddit: MessagesSquare, website: Globe }
const classes = cx(buttonBase, buttonVariantClasses.secondary, buttonSizeClasses.md)

/** The three external controls (AT-13): Google, Reddit, Website (disabled when absent). */
export function ExternalLinks({ item }: { item: Item }) {
  return (
    <div role="group" aria-label="External links" className="flex flex-wrap gap-2">
      {buildExternalLinks(item).map((link) => {
        const Icon = icons[link.id]
        if (link.href === null) {
          return (
            <button key={link.id} type="button" aria-disabled="true" className={classes}>
              <Icon aria-hidden className="size-4" />
              {NO_WEBSITE}
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
            <Icon aria-hidden className="size-4" />
            {link.label}
            <ExternalLink aria-hidden className="size-3.5 text-text-muted" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )
      })}
    </div>
  )
}
