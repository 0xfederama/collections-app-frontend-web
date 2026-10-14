import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const motorcycleFields = defineFields<components['schemas']['MotorcycleMetadata']>()([
  { key: 'make', label: 'Make', input: 'text', maxLength: 100 },
  { key: 'model', label: 'Model', input: 'text', maxLength: 100 },
  { key: 'model_year', label: 'Model year', input: 'year', min: 1885, max: 2100 },
  { key: 'segment', label: 'Segment', input: 'text', maxLength: 50 },
  {
    key: 'displacement_cc',
    label: 'Displacement',
    input: 'integer',
    unit: 'cc',
    min: 1,
    max: 5000,
  },
  { key: 'power_hp', label: 'Power', input: 'decimal', unit: 'hp', min: 0, max: 1000 },
  { key: 'torque_nm', label: 'Torque', input: 'decimal', unit: 'Nm', min: 0, max: 1000 },
  { key: 'wet_weight_kg', label: 'Wet weight', input: 'integer', unit: 'kg', min: 1, max: 1000 },
  {
    key: 'seat_height_mm',
    label: 'Seat height',
    input: 'integer',
    unit: 'mm',
    min: 300,
    max: 1200,
  },
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
