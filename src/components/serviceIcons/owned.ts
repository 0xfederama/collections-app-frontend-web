/**
 * F-022-W3: the streaming services the user owns (`settings.owned_streaming_services`, provider keys of
 * the registry). Streaming shown on items and rows keeps only those; an empty list shows every platform.
 * Lives here, not in a feature, so items and lists can both import it (F020 boundaries).
 */

import { findService, normalizeServiceName, SERVICES, type ServiceEntry } from './registry'

/** The streaming services the Settings picker offers, in registry order. */
export const STREAMING_OFFERED: ServiceEntry[] = SERVICES.filter(
  (entry) => entry.streaming === true,
)

/** The display name of a provider key, or the key itself when the registry does not know it. */
export const serviceLabel = (key: string): string =>
  SERVICES.find((entry) => entry.key === key)?.label ?? key

/**
 * The platforms to show under the owned-services setting, one per service. Names that resolve to the same
 * registry key (TMDB lists Prime Video and its ad tier, or an Amazon Channel, together) keep only the
 * first; unknown names are deduplicated by their normalised name. `owned` empty means every platform.
 * Otherwise a platform is kept only when its name resolves (label, key or alias) to a key in `owned`; a
 * name the registry does not know is hidden, since nothing tells us it is owned. Does not mutate.
 */
export function filterOwnedPlatforms<T>(
  platforms: readonly T[],
  owned: readonly string[],
  nameOf: (platform: T) => string,
): T[] {
  const keys = new Set(owned)
  const seen = new Set<string>()
  return platforms.filter((platform) => {
    const key = findService(nameOf(platform))?.key
    if (owned.length > 0 && (key === undefined || !keys.has(key))) return false
    const id = key ?? `?${normalizeServiceName(nameOf(platform))}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}
