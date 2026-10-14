import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const carFields = defineFields<components['schemas']['CarMetadata']>()([
  { key: 'make', label: 'Make', input: 'text', maxLength: 100 },
  { key: 'model', label: 'Model', input: 'text', maxLength: 100 },
  { key: 'trim', label: 'Trim', input: 'text', maxLength: 100 },
  { key: 'model_year', label: 'Model year', input: 'year', min: 1885, max: 2100 },
  { key: 'body_type', label: 'Body type', input: 'text', maxLength: 50 },
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
  {
    key: 'transmission',
    label: 'Transmission',
    input: 'enum',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'automatic', label: 'Automatic' },
    ],
  },
  { key: 'power_hp', label: 'Power', input: 'decimal', unit: 'hp', min: 0, max: 2000 },
  { key: 'seats', label: 'Seats', input: 'integer', min: 1, max: 9 },
  {
    key: 'electric_range_km',
    label: 'Electric range',
    input: 'integer',
    unit: 'km',
    min: 1,
    max: 2000,
  },
])
