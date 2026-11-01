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
  it('every entry has a vendored file, and every vendored file has at least one entry', () => {
    const files = SERVICES.map((e) => e.file)
    for (const file of files) {
      expect(ASSET_FILES, file).toContain(file)
    }
    for (const file of ASSET_FILES) {
      expect(files, file).toContain(file)
    }
  })

  it('a file may back two entries only when they are the same brand mark (store and streaming)', () => {
    const shared = new Map<string, string[]>()
    for (const entry of SERVICES) {
      shared.set(entry.file, [...(shared.get(entry.file) ?? []), entry.label])
    }
    const sharing = [...shared.entries()].filter(([, labels]) => labels.length > 1)
    expect(sharing).toEqual([
      ['prime-video.svg', ['Prime Video', 'Amazon Video']],
      ['apple-tv.svg', ['Apple TV+', 'Apple TV Store']],
    ])
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
    ['Apple TV Store', 'Apple TV Store'],
    ['apple_tv_store', 'Apple TV Store'],
    ['appletvstore', 'Apple TV Store'],
    ['Apple TV+', 'Apple TV+'],
    ['Apple TV', 'Apple TV+'],
    ['Amazon Video', 'Amazon Video'],
    ['amazon_video', 'Amazon Video'],
    ['amazonvideo', 'Amazon Video'],
    ['Amazon Prime Video', 'Prime Video'],
  ])('resolves %s to %s', (name, label) => {
    expect(findService(name)?.label).toBe(label)
  })

  it.each([
    ['Apple TV Store', 'apple-tv.svg'],
    ['Apple TV', 'apple-tv.svg'],
    ['Amazon Video', 'prime-video.svg'],
  ])('%s is drawn with the mark %s', (name, file) => {
    expect(findService(name)?.file).toBe(file)
  })

  it('lists Apple TV Store and Amazon Video in the streaming picker, next to their sibling', () => {
    const streaming = STREAMING_SERVICES
    expect(streaming.indexOf('Apple TV Store')).toBe(streaming.indexOf('Apple TV+') + 1)
    expect(streaming.indexOf('Amazon Video')).toBe(streaming.indexOf('Prime Video') + 1)
  })

  it('no inset mark sits on the neutral tile: every mark without its own background is white', () => {
    const offenders = SERVICES.filter((e) => e.fit === 'inset' && e.tile === 'neutral').map(
      (e) => e.key,
    )
    expect(offenders).toEqual([])
  })
  it('returns undefined for a name that is not in the registry', () => {
    expect(findService('Hulu2')).toBeUndefined()
    expect(findService('Zattoo')).toBeUndefined()
  })

  it('derives the streaming picker from the entries, keeping the original seven in order', () => {
    const originalSeven = [
      'Netflix',
      'Prime Video',
      'Disney+',
      'Apple TV+',
      'YouTube',
      'TIMvision',
      'Infinity',
    ]
    expect(STREAMING_SERVICES.filter((label) => originalSeven.includes(label))).toEqual(
      originalSeven,
    )
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
