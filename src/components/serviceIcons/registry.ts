/**
 * F017-W2: one registry of the service marks (stores, links, streaming platforms). It replaces the
 * maps in `ServiceIcon.tsx` and the hand-kept streaming list: the picker lists are derived from it,
 * and `registry.test.ts` fails when an entry has no file or a file has no entry.
 */

import { SERVICES, type ServiceEntry } from './entries'

export { SERVICES } from './entries'
export type { Fit, ServiceEntry, TileStyle } from './entries'

/** Lower case, only letters, digits and `+`: the rule every lookup uses. */
export const normalizeServiceName = (name: string) => name.toLowerCase().replace(/[^a-z0-9+]/g, '')

const assets = import.meta.glob('../../assets/services/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const assetUrls = new Map<string, string>()
for (const [path, url] of Object.entries(assets)) {
  const file = path.slice(path.lastIndexOf('/') + 1)
  assetUrls.set(file, url)
}

/** Every file in `src/assets/services/` (basenames). Tests check it against `SERVICES`. */
export const ASSET_FILES: string[] = [...assetUrls.keys()]

/** URL of a vendored mark, or `undefined` when the file is not in `src/assets/services/`. */
export const assetUrl = (file: string): string | undefined => assetUrls.get(file)

/** Every normalised key, label and alias, mapped to its entry. Built once. */
const byName = new Map<string, ServiceEntry>()
for (const entry of SERVICES) {
  for (const name of [entry.key, entry.label, ...entry.aliases]) {
    byName.set(normalizeServiceName(name), entry)
  }
}

/** The registry entry for a store key, a streaming name or a link site, or `undefined`. */
export const findService = (name: string): ServiceEntry | undefined =>
  byName.get(normalizeServiceName(name))

/** The streaming services offered in the item's picker, in display order (derived). */
export const STREAMING_SERVICES: string[] = SERVICES.filter((e) => e.streaming).map((e) => e.label)
