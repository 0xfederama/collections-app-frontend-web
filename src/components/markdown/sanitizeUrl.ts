const ALLOWED_PROTOCOLS = /^(?:https?|mailto)$/i

/**
 * URL policy for rendered Markdown (D-014): `http`, `https`, `mailto` and relative URLs only.
 * `javascript:`, `data:`, `vbscript:` and every other scheme become `''`. A scheme is whatever
 * comes before the first `:`, unless a `/`, `?` or `#` comes first (then it is a relative URL).
 */
export function sanitizeUrl(url: string): string {
  const colon = url.indexOf(':')
  if (colon === -1) return url
  const delimiter = url.search(/[/?#]/)
  if (delimiter !== -1 && delimiter < colon) return url
  return ALLOWED_PROTOCOLS.test(url.slice(0, colon)) ? url : ''
}
