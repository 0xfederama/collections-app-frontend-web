import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const motorcycleFields = defineFields<components['schemas']['MotorcycleMetadata']>()([
  { key: 'model_year', label: 'Model year', input: 'year', min: 1885, max: 2100 },
  {
    key: 'displacement_cc',
    label: 'Displacement',
    input: 'integer',
    unit: 'cc',
    min: 1,
    max: 5000,
  },
  { key: 'power_hp', label: 'Power', input: 'decimal', unit: 'hp', min: 0, max: 1000 },
  {
    key: 'license_class',
    label: 'License class',
    input: 'enum',
    options: [
      { value: 'AM', label: 'AM' },
      { value: 'A1', label: 'A1' },
      { value: 'A2', label: 'A2' },
      { value: 'A', label: 'A' },
    ],
  },
])
