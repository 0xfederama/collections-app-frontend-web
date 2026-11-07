import { safeWebsiteUrl } from './external'

/**
 * The favicon of a website, for the icon in front of its link (roadmap 28). It is served by our own
 * backend (`GET /api/v1/favicon`, D-132), same-origin. The server only uses the origin of `url`, so
 * the origin is passed to share one cache entry per site. `null` for anything but http(s); a site
 * with no icon answers 404 and `SiteIcon` falls back to the globe.
 */
export function faviconUrl(siteUrl: string): string | null {
  if (!safeWebsiteUrl(siteUrl)) return null
  const { origin } = new URL(siteUrl)
  return `${globalThis.location.origin}/api/v1/favicon?url=${encodeURIComponent(origin)}`
}

/** The host of a web address for display (`www.ducati.com`), or `null` when it is not http(s). */
export function siteHost(siteUrl: string): string | null {
  return safeWebsiteUrl(siteUrl) ? new URL(siteUrl).host : null
}
