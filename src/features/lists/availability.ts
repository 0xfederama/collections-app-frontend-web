import type { TypeDefinition } from '../settings'

/** The values of the `availability` query of `GET /lists/{id}/items` (F-026 W4). */
export type Availability = 'available' | 'included'

export const AVAILABILITY_PARAM = 'availability'

export const AVAILABILITY_OPTIONS: readonly { value: Availability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'included', label: 'Available, not paid' },
]

/** Only types that carry streaming platforms (movie, TV) can be filtered by availability. */
export function supportsAvailability(definition: TypeDefinition | undefined | null): boolean {
  return !!definition?.fields.some((field) => field.type === 'streaming')
}

/** The `?availability=` value when valid and the type supports it, otherwise `null`. */
export function parseAvailability(
  value: string | null,
  definition: TypeDefinition | undefined | null,
): Availability | null {
  const option = AVAILABILITY_OPTIONS.find((candidate) => candidate.value === value)
  return option && supportsAvailability(definition) ? option.value : null
}

export function availabilityLabel(value: Availability | null): string | null {
  return AVAILABILITY_OPTIONS.find((option) => option.value === value)?.label ?? null
}
