import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error js-yaml ships no types and @types/js-yaml is not a dependency
import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import type { ItemKind } from '../api'
import { formatField, formatTvYears, kindFields, kindRows } from './index'

interface SpecProperty {
  enum?: string[]
}
interface Spec {
  components: { schemas: Record<string, { properties: Record<string, SpecProperty> }> }
}

const spec = yaml.load(readFileSync(join(process.cwd(), 'api/openapi.yaml'), 'utf8')) as Spec

const schemaOf: [ItemKind, string][] = [
  ['movie', 'MovieMetadata'],
  ['tv_show', 'TvShowMetadata'],
  ['motorcycle', 'MotorcycleMetadata'],
  ['car', 'CarMetadata'],
  ['camera', 'CameraMetadata'],
]

const field = (kind: ItemKind, key: string) => {
  const found = kindFields[kind].find((f) => f.key === key)
  if (!found) throw new Error(`no field ${kind}.${key}`)
  return found
}

describe('kind field config matches the vendored spec', () => {
  it.each(schemaOf)('%s: same property keys as %s', (kind, schema) => {
    const properties = spec.components.schemas[schema]!.properties
    expect(new Set(kindFields[kind].map((f) => f.key))).toEqual(new Set(Object.keys(properties)))
  })

  it.each(schemaOf)('%s: enum options equal the spec enum of %s', (kind, schema) => {
    const properties = spec.components.schemas[schema]!.properties
    let enums = 0
    for (const [key, prop] of Object.entries(properties)) {
      if (!prop.enum) continue
      enums++
      const config = field(kind, key)
      expect(config.input).toBe('enum')
      expect(new Set(config.options?.map((o) => o.value))).toEqual(new Set(prop.enum))
      expect(config.options).toHaveLength(prop.enum.length)
    }
    // Every enum field of the config is an enum in the spec too.
    const configEnums = kindFields[kind].filter((f) => f.input === 'enum')
    expect(configEnums).toHaveLength(enums)
  })

  it('generic has no fields', () => {
    expect(kindFields.generic).toEqual([])
  })
})

describe('formatField', () => {
  it('formats numbers with their unit', () => {
    expect(formatField(field('motorcycle', 'displacement_cc'), 937)).toBe('937 cc')
    expect(formatField(field('motorcycle', 'power_hp'), 111)).toBe('111 hp')
    expect(formatField(field('motorcycle', 'torque_nm'), 93.1)).toBe('93.1 Nm')
    expect(formatField(field('camera', 'megapixels'), 24.2)).toBe('24.2 MP')
    expect(formatField(field('movie', 'runtime_minutes'), 136)).toBe('136 min')
  })

  it('rounds decimals to one digit', () => {
    expect(formatField(field('camera', 'megapixels'), 24.26)).toBe('24.3 MP')
  })

  it('shows years without digit grouping', () => {
    expect(formatField(field('movie', 'release_year'), 1999)).toBe('1999')
    expect(formatField(field('car', 'model_year'), 2024)).toBe('2024')
  })

  it('maps enum values to their label, and keeps an unknown value as is', () => {
    expect(formatField(field('car', 'fuel_type'), 'plugin_hybrid')).toBe('Plug-in hybrid')
    expect(formatField(field('camera', 'camera_type'), 'dslr')).toBe('DSLR')
    expect(formatField(field('car', 'fuel_type'), 'warp')).toBe('warp')
  })

  it('shows text as is', () => {
    expect(formatField(field('car', 'make'), 'Fiat')).toBe('Fiat')
  })

  it.each([[undefined], [null]])('unset (%s) gives null', (value) => {
    expect(formatField(field('motorcycle', 'displacement_cc'), value)).toBeNull()
    expect(formatField(field('car', 'fuel_type'), value)).toBeNull()
    expect(formatField(field('car', 'make'), value)).toBeNull()
    expect(formatField(field('movie', 'release_year'), value)).toBeNull()
  })

  it('blank text gives null', () => {
    expect(formatField(field('car', 'make'), '  ')).toBeNull()
  })
})

describe('formatTvYears', () => {
  it('formats a finished run', () => {
    expect(formatTvYears(2019, 2023)).toBe('2019–2023')
  })
  it('formats an ongoing run', () => {
    expect(formatTvYears(2019, undefined)).toBe('2019–present')
  })
  it('collapses a run that ended the year it started', () => {
    expect(formatTvYears(2019, 2019)).toBe('2019')
  })
  it('gives null when nothing is known', () => {
    expect(formatTvYears(undefined, undefined)).toBeNull()
  })
})

describe('kindRows', () => {
  it.each<ItemKind>(['generic', 'movie', 'tv_show', 'motorcycle', 'car', 'camera'])(
    '%s with empty metadata has no rows',
    (kind) => {
      expect(kindRows(kind, {})).toEqual([])
    },
  )

  it('skips imdb_url and streaming', () => {
    const rows = kindRows('movie', {
      release_year: 1999,
      runtime_minutes: 136,
      imdb_url: 'https://www.imdb.com/title/tt0133093/',
      streaming: { country: 'IT', platforms: ['Netflix'] },
    })
    expect(rows.map((r) => r.key)).toEqual(['release_year', 'runtime_minutes'])
    expect(rows.map((r) => r.text)).toEqual(['1999', '136 min'])
  })

  it('a movie with only IMDb and streaming has no rows', () => {
    expect(
      kindRows('movie', {
        imdb_url: 'https://www.imdb.com/title/tt0133093/',
        streaming: { country: 'IT' },
      }),
    ).toEqual([])
  })

  it('tv_show yields one Years row and no separate year rows', () => {
    const rows = kindRows('tv_show', { first_air_year: 2019, end_year: 2023, seasons: 4 })
    expect(rows.filter((r) => r.label === 'Years')).toEqual([
      { key: 'years', label: 'Years', text: '2019–2023' },
    ])
    expect(rows.map((r) => r.label)).toEqual(['Years', 'Seasons'])
  })

  it('tv_show ongoing and single-year', () => {
    expect(kindRows('tv_show', { first_air_year: 2019 })[0]?.text).toBe('2019–present')
    expect(kindRows('tv_show', { first_air_year: 2019, end_year: 2019 })[0]?.text).toBe('2019')
  })

  it('keeps config order and units for a motorcycle', () => {
    const rows = kindRows('motorcycle', {
      license_class: 'A',
      displacement_cc: 937,
      make: 'Ducati',
      power_hp: 111,
    })
    expect(rows.map((r) => [r.label, r.text])).toEqual([
      ['Make', 'Ducati'],
      ['Displacement', '937 cc'],
      ['Power', '111 hp'],
      ['License class', 'A'],
    ])
  })
})
