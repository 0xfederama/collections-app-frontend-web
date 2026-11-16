import type { TypeDefinition } from '../settings'
import { supportsAvailability } from './availability'

/**
 * Movie and TV lists (F-028): TMDB supplies the rating (sort) and the genres (filter). The gate reads
 * the definition, not the type key (D-085): a type with streaming platforms is the TMDB-backed kind
 * today, the same rule `supportsAvailability` uses, so a book or a vehicle never gets either.
 */
export function supportsTmdbData(definition: TypeDefinition | undefined | null): boolean {
  return supportsAvailability(definition)
}
