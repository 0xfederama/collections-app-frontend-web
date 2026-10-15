import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const carFields = defineFields<components['schemas']['CarMetadata']>()([
  { key: 'make', label: 'Make', input: 'text', maxLength: 100 },
  { key: 'model', label: 'Model', input: 'text', maxLength: 100 },
  { key: 'model_year', label: 'Model year', input: 'year', min: 1885, max: 2100 },
  {
    key: 'fuel_type',
    label: 'Fuel',
    input: 'enum',
    options: [
      { value: 'petrol', label: 'Petrol' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'plugin_hybrid', label: 'Plug-in hybrid' },
      { value: 'electric', label: 'Electric' },
      { value: 'lpg', label: 'LPG' },
      { value: 'cng', label: 'CNG' },
      { value: 'hydrogen', label: 'Hydrogen' },
      { value: 'other', label: 'Other' },
    ],
  },
  { key: 'power_hp', label: 'Power', input: 'decimal', unit: 'hp', min: 0, max: 2000 },
])
