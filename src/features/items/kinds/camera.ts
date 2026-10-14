import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const cameraFields = defineFields<components['schemas']['CameraMetadata']>()([
  { key: 'make', label: 'Make', input: 'text', maxLength: 100 },
  { key: 'model', label: 'Model', input: 'text', maxLength: 100 },
  { key: 'release_year', label: 'Release year', input: 'year', min: 1900, max: 2100 },
  {
    key: 'camera_type',
    label: 'Type',
    input: 'enum',
    options: [
      { value: 'mirrorless', label: 'Mirrorless' },
      { value: 'dslr', label: 'DSLR' },
      { value: 'compact', label: 'Compact' },
      { value: 'rangefinder', label: 'Rangefinder' },
      { value: 'medium_format', label: 'Medium format' },
      { value: 'film', label: 'Film' },
      { value: 'action', label: 'Action' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'sensor_format',
    label: 'Sensor',
    input: 'enum',
    options: [
      { value: 'full_frame', label: 'Full frame' },
      { value: 'aps_c', label: 'APS-C' },
      { value: 'micro_four_thirds', label: 'Micro Four Thirds' },
      { value: 'one_inch', label: '1-inch' },
      { value: 'medium_format', label: 'Medium format' },
      { value: 'film_35mm', label: '35 mm film' },
      { value: 'other', label: 'Other' },
    ],
  },
  { key: 'megapixels', label: 'Resolution', input: 'decimal', unit: 'MP', min: 0.1, max: 500 },
  { key: 'lens_mount', label: 'Lens mount', input: 'text', maxLength: 50 },
  { key: 'weight_g', label: 'Weight', input: 'integer', unit: 'g', min: 1, max: 10000 },
])
