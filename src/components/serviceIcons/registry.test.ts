import { describe, expect, it } from 'vitest'
import {
  ASSET_FILES,
  SERVICES,
  STREAMING_SERVICES,
  findService,
  normalizeServiceName,
  sortByServiceOrder,
} from './registry'

describe('F017-W2 service registry', () => {
  it('every entry has a vendored file, and every vendored file has exactly one entry', () => {
    const files = SERVICES.map((e) => e.file)
    for (const file of files) {
      expect(ASSET_FILES, file).toContain(file)
    }
    expect(new Set(files).size).toBe(files.length)
    expect(files.length).toBe(ASSET_FILES.length)
    for (const file of ASSET_FILES) {
      expect(
        files.filter((f) => f === file),
        file,
      ).toHaveLength(1)
    }
  })

  it('no two entries claim the same key, label or alias (after normalising)', () => {
    const owner = new Map<string, string>()
    for (const entry of SERVICES) {
      const names = new Set([entry.key, entry.label, ...entry.aliases].map(normalizeServiceName))
      for (const name of names) {
        const previous = owner.get(name)
        expect(previous === undefined || previous === entry.key, `${name} claimed twice`).toBe(true)
        owner.set(name, entry.key)
      }
    }
  })

  it('keys and labels are unique across entries', () => {
    expect(new Set(SERVICES.map((e) => e.key)).size).toBe(SERVICES.length)
    expect(new Set(SERVICES.map((e) => e.label)).size).toBe(SERVICES.length)
  })

  it.each([
    ['Disney Plus', 'Disney+'],
    ['disney+', 'Disney+'],
    ['Amazon Prime Video', 'Prime Video'],
    ['MEDIASET INFINITY', 'Infinity'],
    ['google_play_books', 'Google Play'],
    ['apple_books', 'Apple Books'],
    ['HBO Max', 'HBO Max'],
    ['Max', 'HBO Max'],
  ])('resolves %s to %s', (name, label) => {
    expect(findService(name)?.label).toBe(label)
  })

  it('returns undefined for a name that is not in the registry', () => {
    expect(findService('Hulu2')).toBeUndefined()
    expect(findService('Zattoo')).toBeUndefined()
  })

  it('derives the streaming picker from the entries, starting with the original seven in order', () => {
    expect(STREAMING_SERVICES.slice(0, 7)).toEqual([
      'Netflix',
      'Prime Video',
      'Disney+',
      'Apple TV+',
      'YouTube',
      'TIMvision',
      'Infinity',
    ])
    expect(STREAMING_SERVICES).toEqual(SERVICES.filter((e) => e.streaming).map((e) => e.label))
  })
})

describe('F017-W2 sortByServiceOrder', () => {
  it('puts the original seven first in their order, new services after, unknown last', () => {
    const input = ['Zattoo', 'Hulu', 'YouTube', 'Netflix', 'Prime Video', 'Peacock', 'Disney+']
    expect(sortByServiceOrder(input, (name) => name)).toEqual([
      'Netflix',
      'Prime Video',
      'Disney+',
      'YouTube',
      'Hulu',
      'Peacock',
      'Zattoo',
    ])
  })
})
