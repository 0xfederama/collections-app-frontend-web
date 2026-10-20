// Optimistic concurrency (API §3): ETags are typed per resource and derived from `version`.
const PREFIX = {
  folder: 'f',
  list: 'l',
  item: 'i',
  content: 'c',
  settings: 's',
} as const

type EtagResource = keyof typeof PREFIX

/** The ETag string of a resource version, e.g. `etag('item', 3)` is `"i-3"` (with the quotes). */
export function etag(resource: EtagResource, version: number): string {
  if (!Number.isInteger(version) || version < 0) {
    throw new RangeError(`invalid ${resource} version: ${version}`)
  }
  return `"${PREFIX[resource]}-${version}"`
}

/**
 * The `If-Match` header for a write, built from the resource and the version the user edited.
 * Use as `params: { header: ifMatch('item', item.version), path: { id } }`.
 * There is deliberately no way to send `*`, and a 412 is never retried with a fresh version.
 */
export function ifMatch(resource: EtagResource, version: number) {
  return { 'If-Match': etag(resource, version) }
}
