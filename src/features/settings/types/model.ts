import { ApiError, NetworkError } from '../../../lib/api'
import type { TypeField } from '../api'

export const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'link', label: 'Link' },
] as const

/** The friendly name of a field type where the raw API word reads badly (`stores` is "Where to get it"'s type, F016-W4). */
export const fieldTypeWord = (type: TypeField['type']) => (type === 'stores' ? 'Stores' : type)

export function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 412)
      return 'This definition changed while you were editing. Reload the latest version and try again.'
    if (error.errors?.length) return error.errors.map((entry) => entry.message).join(' ')
    return error.detail ?? error.title
  }
  if (error instanceof NetworkError)
    return 'Could not reach the server. Your changes are still here; try again.'
  return 'Something went wrong. Your changes are still here; try again.'
}
