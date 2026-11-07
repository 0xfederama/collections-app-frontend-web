import { safeWebsiteUrl } from './external'

/**
 * The favicon of a website, for the icon in front of its link (roadmap 28, phone feedback).
 *
 * TODO(roadmap 28): the backend favicon endpoint is not ready. Until it is, no site has an icon and
 * `SiteIcon` draws the generic globe. When the endpoint lands, return its URL for `siteUrl` here;
 * nothing else changes.
 */
export function faviconUrl(siteUrl: string): string | null {
  void siteUrl
  return null
}

/** The host of a web address for display (`www.ducati.com`), or `null` when it is not http(s). */
export function siteHost(siteUrl: string): string | null {
  return safeWebsiteUrl(siteUrl) ? new URL(siteUrl).host : null
}
