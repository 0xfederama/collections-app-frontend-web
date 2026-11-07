import { SiteIcon } from '../../../components/SiteIcon'
import { faviconUrl } from '../../links'

/**
 * A web address shown as a link (the website, or a URL field of the type): the site's icon in
 * front, the address truncated with an ellipsis so a long one never overflows the row or runs under
 * the edit pen. It opens in a new tab; a click on it does not open the field's editor (`InlineField`
 * leaves clicks on links alone).
 */
export function SiteLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 max-w-full items-center gap-2 text-accent-text"
    >
      <SiteIcon src={faviconUrl(url)} />
      <span className="min-w-0 truncate underline underline-offset-2">{url}</span>
      {/* The space is a text node, not a flex item: the name reads "url (opens in a new tab)". */}{' '}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
