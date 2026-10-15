import type { components } from '../../../generated/schema'
import { defineFields } from './types'

export const cameraFields = defineFields<components['schemas']['CameraMetadata']>()([
  { key: 'make', label: 'Make', input: 'text', maxLength: 100 },
  { key: 'model', label: 'Model', input: 'text', maxLength: 100 },
  { key: 'release_year', label: 'Release year', input: 'year', min: 1900, max: 2100 },
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
])
