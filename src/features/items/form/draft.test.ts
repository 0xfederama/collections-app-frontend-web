import { describe, expect, it } from 'vitest'
import type { Item, ItemKind } from '../api'
import {
  buildPatch,
  draftDump,
  draftFromItem,
  firstInvalid,
  hasKindDetails,
  isDirty,
  mapServerErrors,
  normalizePrice,
  validate,
  withKind,
  type Defaults,
  type Draft,
} from './draft'

const defaults: Defaults = { currency: 'EUR', country: 'IT' }
const noDefaults: Defaults = { currency: '', country: '' }

function makeItem(kind: ItemKind, over: Partial<Item> = {}): Item {
  return {
    id: '7c1e5a10-0000-4000-8000-000000000101',
    list_id: '7c1e5a10-0000-4000-8000-000000000011',
    title: 'Thing',
    kind,
    summary: null,
    status: null,
    image: null,
    price: null,
    official_website_url: null,
    metadata: {},
    content_version: 0,
    sort_order: 0,
    version: 3,
    created_at: '2026-10-14T09:31:00Z',
    updated_at: '2026-10-14T10:00:00Z',
    path: [],
    ...over,
  } as unknown as Item
}

const movie = () =>
  makeItem('movie', {
    title: 'The Matrix',
    summary: 'A hacker.',
    status: 'Watched',
    metadata: {
      release_year: 1999,
      runtime_minutes: 136,
      imdb_url: 'https://www.imdb.com/title/tt0133093/',
      streaming: { country: 'IT', platforms: ['Netflix', 'Prime Video'] },
    },
  } as Partial<Item>)
const motorcycle = () =>
  makeItem('motorcycle', {
    title: 'Monster',
    metadata: { displacement_cc: 937, power_hp: 111, license_class: 'A' },
  } as Partial<Item>)
const car = () =>
  makeItem('car', {
    title: 'Golf',
    metadata: { fuel_type: 'petrol', power_hp: 110 },
  } as Partial<Item>)
const tvShow = () =>
  makeItem('tv_show', { title: 'Severance', metadata: { first_air_year: 2019 } } as Partial<Item>)

/** The draft of an item with some top-level fields and kind fields replaced. */
function draftOf(item: Item, over: Partial<Draft> = {}, meta: Record<string, string> = {}): Draft {
  const base = draftFromItem(item)
  return { ...base, ...over, meta: { ...base.meta, ...meta } }
}

describe('AT-05 item field rules: validate()', () => {
  const generic = makeItem('generic')
  const ok = (over: Partial<Draft> = {}, d: Defaults = defaults) =>
    validate(draftOf(generic, { title: 'x', ...over }), d)

  it('accepts an untouched item', () => {
    expect(validate(draftFromItem(movie()), defaults)).toEqual({})
  })

  it('requires a title and trims it', () => {
    expect(ok({ title: '' }).title).toBe('Enter a title.')
    expect(ok({ title: '   ' }).title).toBe('Enter a title.')
    expect(ok({ title: '  ok  ' }).title).toBeUndefined()
  })

  it('allows 300 characters and rejects 301', () => {
    expect(ok({ title: 'a'.repeat(300) }).title).toBeUndefined()
    expect(ok({ title: 'a'.repeat(301) }).title).toMatch(/at most 300/)
  })

  it('limits summary (1000), status (100) and the official URL (2048)', () => {
    expect(ok({ summary: 'a'.repeat(1000) }).summary).toBeUndefined()
    expect(ok({ summary: 'a'.repeat(1001) }).summary).toMatch(/1000/)
    expect(ok({ status: 'a'.repeat(100) }).status).toBeUndefined()
    expect(ok({ status: 'a'.repeat(101) }).status).toMatch(/100/)
    expect(ok({ officialUrl: `https://a.io/${'a'.repeat(2040)}` }).official_website_url).toMatch(
      /2048/,
    )
  })

  describe('price', () => {
    it.each(['12', '12.5', '1299.50', '0', '0.99'])('accepts %s', (text) => {
      expect(ok({ priceMin: text })['price.min']).toBeUndefined()
      expect(ok({ priceMax: text })['price.max']).toBeUndefined()
    })

    it.each(['1,5', '12.345', '-1', 'abc', '1.', '.5', '12345678901'])('rejects %s', (text) => {
      expect(ok({ priceMin: text })['price.min']).toBeDefined()
      expect(ok({ priceMax: text })['price.max']).toBeDefined()
    })

    it('enforces min <= max with the error on the maximum', () => {
      expect(ok({ priceMin: '20', priceMax: '10' })['price.max']).toMatch(/lower than the minimum/)
      expect(ok({ priceMin: '10.01', priceMax: '10.00' })['price.max']).toBeDefined()
      expect(ok({ priceMin: '10', priceMax: '10' })['price.max']).toBeUndefined()
      expect(ok({ priceMin: '9.5', priceMax: '10' })['price.max']).toBeUndefined()
    })

    it('accepts a lone minimum or a lone maximum', () => {
      expect(ok({ priceMin: '5' })).toEqual({})
      expect(ok({ priceMax: '5' })).toEqual({})
    })

    it('needs a currency when there is a price and no default', () => {
      expect(ok({ priceMin: '5' }, noDefaults)['price.currency']).toBeDefined()
      expect(ok({ priceMin: '5', currency: 'USD' }, noDefaults)['price.currency']).toBeUndefined()
      expect(ok({ priceMin: '5' }, defaults)['price.currency']).toBeUndefined()
    })

    it('needs no currency when there is no price', () => {
      expect(ok({}, noDefaults)).toEqual({})
    })
  })

  describe('official website', () => {
    it.each(['http://example.com', 'https://example.com/a?b=1'])('accepts %s', (url) => {
      expect(ok({ officialUrl: url }).official_website_url).toBeUndefined()
    })
    it.each(['javascript:alert(1)', 'ftp://x', 'not a url', 'data:text/html,hi'])(
      'rejects %s',
      (url) => {
        expect(ok({ officialUrl: url }).official_website_url).toBeDefined()
      },
    )
    it('is optional', () => {
      expect(ok({ officialUrl: '  ' }).official_website_url).toBeUndefined()
    })
  })

  describe('motorcycle fields', () => {
    const check = (meta: Record<string, string>) =>
      validate(draftOf(motorcycle(), {}, meta), defaults)

    it('displacement_cc is an integer from 1 to 5000 (0 and 5001 rejected, 937 ok)', () => {
      expect(check({ displacement_cc: '0' })['metadata.displacement_cc']).toBeDefined()
      expect(check({ displacement_cc: '5001' })['metadata.displacement_cc']).toBeDefined()
      expect(check({ displacement_cc: '5000' })['metadata.displacement_cc']).toBeUndefined()
      expect(check({ displacement_cc: '1' })['metadata.displacement_cc']).toBeUndefined()
      expect(check({ displacement_cc: '937' })['metadata.displacement_cc']).toBeUndefined()
      expect(check({ displacement_cc: '9.5' })['metadata.displacement_cc']).toBeDefined()
    })

    it('power_hp allows at most one decimal', () => {
      expect(check({ power_hp: '111.25' })['metadata.power_hp']).toBeDefined()
      expect(check({ power_hp: '111.2' })['metadata.power_hp']).toBeUndefined()
      expect(check({ power_hp: '1000' })['metadata.power_hp']).toBeUndefined()
      expect(check({ power_hp: '1000.1' })['metadata.power_hp']).toBeDefined()
    })

    it('license_class must be one of AM, A1, A2, A', () => {
      for (const value of ['AM', 'A1', 'A2', 'A']) {
        expect(check({ license_class: value })['metadata.license_class']).toBeUndefined()
      }
      expect(check({ license_class: 'B' })['metadata.license_class']).toBeDefined()
    })

    it('model_year is a year from 1885 to 2100', () => {
      expect(check({ model_year: '1884' })['metadata.model_year']).toBeDefined()
      expect(check({ model_year: '1885' })['metadata.model_year']).toBeUndefined()
      expect(check({ model_year: '2101' })['metadata.model_year']).toBeDefined()
    })

    it('text fields respect their max length', () => {
      expect(check({ make: 'a'.repeat(100) })['metadata.make']).toBeUndefined()
      expect(check({ make: 'a'.repeat(101) })['metadata.make']).toBeDefined()
      expect(check({ segment: 'a'.repeat(51) })['metadata.segment']).toBeDefined()
    })
  })

  describe('tv_show', () => {
    const check = (meta: Record<string, string>) => validate(draftOf(tvShow(), {}, meta), defaults)

    it('rejects an end year before the first air year', () => {
      expect(check({ first_air_year: '2019', end_year: '2018' })['metadata.end_year']).toBeDefined()
    })
    it('accepts equal or later end years, or none', () => {
      expect(check({ first_air_year: '2019', end_year: '2019' })).toEqual({})
      expect(check({ first_air_year: '2019', end_year: '2023' })).toEqual({})
      expect(check({ first_air_year: '2019', end_year: '' })).toEqual({})
    })
    it('seasons is 1 to 200', () => {
      expect(check({ seasons: '0' })['metadata.seasons']).toBeDefined()
      expect(check({ seasons: '200' })['metadata.seasons']).toBeUndefined()
      expect(check({ seasons: '201' })['metadata.seasons']).toBeDefined()
    })
  })

  describe('car', () => {
    const check = (meta: Record<string, string>) => validate(draftOf(car(), {}, meta), defaults)

    it('electric_range_km is rejected with petrol fuel', () => {
      expect(
        check({ fuel_type: 'petrol', electric_range_km: '50' })['metadata.electric_range_km'],
      ).toBeDefined()
    })
    it('electric_range_km is fine for electric, plugin_hybrid or no fuel', () => {
      expect(check({ fuel_type: 'electric', electric_range_km: '400' })).toEqual({})
      expect(check({ fuel_type: 'plugin_hybrid', electric_range_km: '50' })).toEqual({})
      expect(check({ fuel_type: '', electric_range_km: '50' })).toEqual({})
    })
    it('seats is 1 to 9', () => {
      expect(check({ seats: '0' })['metadata.seats']).toBeDefined()
      expect(check({ seats: '9' })['metadata.seats']).toBeUndefined()
      expect(check({ seats: '10' })['metadata.seats']).toBeDefined()
    })
  })

  describe('movie: IMDb and streaming', () => {
    const check = (over: Partial<Draft>, meta: Record<string, string> = {}, d = defaults) =>
      validate(draftOf(movie(), over, meta), d)

    it('imdb_url must be an https IMDb title link', () => {
      expect(check({}, { imdb_url: 'https://www.imdb.com/title/tt0133093/' })).toEqual({})
      expect(check({}, { imdb_url: 'https://imdb.com/title/tt0133093' })).toEqual({})
      for (const bad of [
        'http://www.imdb.com/title/tt0133093/',
        'https://www.imdb.com/name/nm0000206/',
        'https://example.com/title/tt0133093/',
        'https://www.imdb.com/title/tt12/',
      ]) {
        expect(check({}, { imdb_url: bad })['metadata.imdb_url']).toBeDefined()
      }
    })

    it('release_year and runtime_minutes ranges', () => {
      expect(check({}, { release_year: '1869' })['metadata.release_year']).toBeDefined()
      expect(check({}, { release_year: '1870' })['metadata.release_year']).toBeUndefined()
      expect(check({}, { runtime_minutes: '0' })['metadata.runtime_minutes']).toBeDefined()
      expect(check({}, { runtime_minutes: '1000' })['metadata.runtime_minutes']).toBeUndefined()
      expect(check({}, { runtime_minutes: '1001' })['metadata.runtime_minutes']).toBeDefined()
    })

    it('streaming country must be two letters', () => {
      for (const bad of ['ITA', 'I', '12']) {
        expect(check({ streamingCountry: bad })['metadata.streaming.country']).toBeDefined()
      }
      expect(check({ streamingCountry: 'us' })['metadata.streaming.country']).toBeUndefined()
    })

    it('an empty country falls back to the settings country', () => {
      expect(
        check({ streamingCountry: '', streamingPlatforms: 'Netflix' })[
          'metadata.streaming.country'
        ],
      ).toBeUndefined()
      expect(
        check({ streamingCountry: '', streamingPlatforms: 'Netflix' }, {}, noDefaults)[
          'metadata.streaming.country'
        ],
      ).toBeDefined()
    })

    it('allows 30 platforms and rejects 31 (repeats collapse)', () => {
      const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`).join(', ')
      expect(
        check({ streamingPlatforms: names(30) })['metadata.streaming.platforms'],
      ).toBeUndefined()
      expect(check({ streamingPlatforms: names(31) })['metadata.streaming.platforms']).toMatch(/30/)
      expect(
        check({ streamingPlatforms: `${names(30)}, p0, P1` })['metadata.streaming.platforms'],
      ).toBeUndefined()
    })

    it('a platform name is at most 60 characters', () => {
      expect(
        check({ streamingPlatforms: 'a'.repeat(60) })['metadata.streaming.platforms'],
      ).toBeUndefined()
      expect(check({ streamingPlatforms: 'a'.repeat(61) })['metadata.streaming.platforms']).toMatch(
        /60/,
      )
    })
  })
})

describe('AT-05 item field rules: normalizePrice()', () => {
  it('pads to two decimals and rejects bad input', () => {
    expect(normalizePrice('12')).toBe('12.00')
    expect(normalizePrice('12.5')).toBe('12.50')
    expect(normalizePrice(' 1299.50 ')).toBe('1299.50')
    expect(normalizePrice('1,5')).toBeNull()
    expect(normalizePrice('')).toBeNull()
  })
})

describe('AT-05 item field rules: buildPatch()', () => {
  it('an unchanged form gives an empty patch', () => {
    for (const item of [movie(), motorcycle(), car(), tvShow(), makeItem('generic')]) {
      expect(buildPatch(item, draftFromItem(item), defaults)).toEqual({})
      expect(isDirty(item, draftFromItem(item), defaults)).toBe(false)
    }
  })

  it('returns only the changed fields', () => {
    const item = movie()
    expect(buildPatch(item, draftOf(item, { title: 'Reloaded' }), defaults)).toEqual({
      title: 'Reloaded',
    })
    expect(buildPatch(item, draftOf(item, { status: 'Owned' }), defaults)).toEqual({
      status: 'Owned',
    })
    expect(
      buildPatch(item, draftOf(item, { officialUrl: ' https://matrix.example ' }), defaults),
    ).toEqual({ official_website_url: 'https://matrix.example' })
  })

  it('padding spaces are not a change; the title is trimmed when it is', () => {
    const item = movie()
    expect(buildPatch(item, draftOf(item, { title: '  The Matrix  ' }), defaults)).toEqual({})
    expect(buildPatch(item, draftOf(item, { title: '  Neo ' }), defaults)).toEqual({ title: 'Neo' })
  })

  it('"12.5" and "12.50" are the same price; 2019 and "2019" the same year', () => {
    const priced = makeItem('generic', {
      price: { min: '12.50', max: null, currency: 'EUR' },
    } as Partial<Item>)
    expect(buildPatch(priced, draftOf(priced, { priceMin: '12.5' }), defaults)).toEqual({})
    expect(buildPatch(priced, draftOf(priced, { priceMin: '12.5' }), noDefaults)).toEqual({})
    const tv = tvShow()
    expect(buildPatch(tv, draftOf(tv, {}, { first_air_year: ' 2019 ' }), defaults)).toEqual({})
  })

  it('clearing a nullable field sends null', () => {
    const item = makeItem('generic', {
      summary: 's',
      status: 'x',
      official_website_url: 'https://a.io',
      price: { min: '1.00', max: null, currency: 'EUR' },
    } as Partial<Item>)
    const cleared = draftOf(item, {
      summary: '',
      status: '  ',
      officialUrl: '',
      priceMin: '',
      priceMax: '',
    })
    expect(buildPatch(item, cleared, defaults)).toEqual({
      summary: null,
      status: null,
      official_website_url: null,
      price: null,
    })
  })

  it('normalizes a new price to two decimals', () => {
    const item = makeItem('generic')
    const patch = buildPatch(item, draftOf(item, { priceMin: '12.5', priceMax: '20' }), defaults)
    expect(patch.price).toEqual({ min: '12.50', max: '20.00', currency: 'EUR' })
  })

  it('uses the settings currency when the draft has none, and the draft one otherwise', () => {
    const item = makeItem('generic')
    expect(buildPatch(item, draftOf(item, { priceMax: '9' }), defaults).price).toEqual({
      min: null,
      max: '9.00',
      currency: 'EUR',
    })
    expect(
      buildPatch(item, draftOf(item, { priceMax: '9', currency: 'USD' }), defaults).price,
    ).toEqual({ min: null, max: '9.00', currency: 'USD' })
  })

  it('changing only the currency of an existing price is a change', () => {
    const item = makeItem('generic', {
      price: { min: '5.00', max: '5.00', currency: 'EUR' },
    } as Partial<Item>)
    expect(buildPatch(item, draftOf(item, { currency: 'USD' }), defaults)).toEqual({
      price: { min: '5.00', max: '5.00', currency: 'USD' },
    })
  })

  it('changing a kind field sends the FULL metadata object (D-062)', () => {
    const item = movie()
    const patch = buildPatch(item, draftOf(item, {}, { runtime_minutes: '140' }), defaults)
    expect(patch).toEqual({
      metadata: {
        release_year: 1999,
        runtime_minutes: 140,
        imdb_url: 'https://www.imdb.com/title/tt0133093/',
        streaming: { country: 'IT', platforms: ['Netflix', 'Prime Video'] },
      },
    })
  })

  it('clearing a kind field drops the key from the full metadata object', () => {
    const item = movie()
    const patch = buildPatch(item, draftOf(item, {}, { runtime_minutes: '' }), defaults)
    expect(patch.metadata).toEqual({
      release_year: 1999,
      imdb_url: 'https://www.imdb.com/title/tt0133093/',
      streaming: { country: 'IT', platforms: ['Netflix', 'Prime Video'] },
    })
  })

  it('a streaming change sends the full metadata too', () => {
    const item = movie()
    const patch = buildPatch(item, draftOf(item, { streamingPlatforms: 'Netflix' }), defaults)
    expect(patch.metadata).toMatchObject({
      release_year: 1999,
      streaming: { country: 'IT', platforms: ['Netflix'] },
    })
  })

  it('numeric fields are sent as numbers', () => {
    const item = motorcycle()
    const patch = buildPatch(
      item,
      draftOf(item, {}, { power_hp: '95.5', seat_height_mm: '800' }),
      defaults,
    )
    expect(patch.metadata).toMatchObject({
      power_hp: 95.5,
      seat_height_mm: 800,
      displacement_cc: 937,
    })
  })

  it('a kind change always sends kind and metadata', () => {
    const item = movie()
    const toCar = withKind(draftFromItem(item), item, 'car')
    expect(buildPatch(item, toCar, defaults)).toEqual({ kind: 'car', metadata: {} })
  })

  it('a kind change on an item without details still sends metadata: {}', () => {
    const item = makeItem('generic')
    const toMovie = withKind(draftFromItem(item), item, 'movie')
    expect(buildPatch(item, toMovie, defaults)).toEqual({ kind: 'movie', metadata: {} })
  })

  it('a kind change keeps new values typed for the new kind', () => {
    const item = movie()
    const toCar = withKind(draftFromItem(item), item, 'car')
    const patch = buildPatch(item, { ...toCar, meta: { seats: '5' } }, defaults)
    expect(patch).toEqual({ kind: 'car', metadata: { seats: 5 } })
  })

  it('switching kind and back restores the original details and gives {}', () => {
    const item = movie()
    const away = withKind(draftFromItem(item), item, 'camera')
    expect(away.meta).toEqual({})
    expect(away.streamingPlatforms).toBe('')
    const back = withKind(away, item, 'movie')
    expect(back).toEqual(draftFromItem(item))
    expect(buildPatch(item, back, defaults)).toEqual({})
  })

  it('withKind keeps the basics typed so far', () => {
    const item = movie()
    const typed = draftOf(item, { title: 'Edited' })
    expect(withKind(typed, item, 'car').title).toBe('Edited')
    expect(withKind(typed, item, 'movie')).toBe(typed)
  })

  it('hasKindDetails tells whether a kind change would clear something', () => {
    expect(hasKindDetails(movie())).toBe(true)
    expect(hasKindDetails(makeItem('generic'))).toBe(false)
  })
})

describe('AT-09 draft dump: draftDump()', () => {
  it('lists only the changed fields with readable labels', () => {
    const item = movie()
    const dump = draftDump(
      item,
      draftOf(item, { title: 'Reloaded' }, { runtime_minutes: '140' }),
      defaults,
    )
    expect(dump).toContain('Title: Reloaded')
    expect(dump).toContain('Movie details:')
    expect(dump).toContain('Runtime: 140 min')
    expect(dump).not.toContain('Summary')
    expect(dump).not.toContain('Release year')
  })

  it('says (cleared) for cleared fields', () => {
    const item = movie()
    const dump = draftDump(
      item,
      draftOf(item, { summary: '', status: '' }, { runtime_minutes: '' }),
      defaults,
    )
    expect(dump).toContain('Summary: (cleared)')
    expect(dump).toContain('Status: (cleared)')
    expect(dump).toContain('Runtime: (cleared)')
  })

  it('describes price, official website and kind changes', () => {
    const item = makeItem('generic')
    const priced = draftOf(item, {
      priceMin: '5',
      priceMax: '10',
      officialUrl: 'https://a.io',
    })
    const dump = draftDump(item, priced, defaults)
    expect(dump).toContain('Price: 5.00–10.00 EUR')
    expect(dump).toContain('Official website: https://a.io')
    expect(draftDump(item, withKind(priced, item, 'car'), defaults)).toContain('Kind: Car')
  })

  it('is empty when nothing changed', () => {
    const item = movie()
    expect(draftDump(item, draftFromItem(item), defaults)).toBe('')
  })
})

describe('AT-22 server errors: mapServerErrors()', () => {
  const err = (field: string, message = 'bad') => ({ field, message, code: 'invalid' })

  it('maps title and price.max onto their inputs', () => {
    const { fields, other } = mapServerErrors([err('title', 'T'), err('price.max', 'P')], 'movie')
    expect(fields).toEqual({ title: 'T', 'price.max': 'P' })
    expect(other).toEqual([])
  })

  it('aliases "price" to the minimum price input', () => {
    expect(mapServerErrors([err('price', 'P')], 'generic').fields).toEqual({ 'price.min': 'P' })
  })

  it('metadata keys go to the input when the kind has one, else to other', () => {
    const onBike = mapServerErrors([err('metadata.power_hp', 'hp')], 'motorcycle')
    expect(onBike.fields).toEqual({ 'metadata.power_hp': 'hp' })
    const onMovie = mapServerErrors([err('metadata.power_hp', 'hp')], 'movie')
    expect(onMovie.fields).toEqual({})
    expect(onMovie.other).toHaveLength(1)
    expect(onMovie.other[0]).toContain('hp')
  })

  it('strips array indexes: platforms[2] maps to the platforms input', () => {
    const { fields } = mapServerErrors([err('metadata.streaming.platforms[2]', 'long')], 'movie')
    expect(fields).toEqual({ 'metadata.streaming.platforms': 'long' })
  })

  it('aliases metadata.streaming to the country input', () => {
    expect(mapServerErrors([err('metadata.streaming', 'x')], 'movie').fields).toEqual({
      'metadata.streaming.country': 'x',
    })
  })

  it('an unknown field goes to other with its message', () => {
    const { fields, other } = mapServerErrors([err('bogus.thing', 'nope')], 'movie')
    expect(fields).toEqual({})
    expect(other).toEqual([expect.stringContaining('nope')])
  })

  it('two errors on the same input are joined', () => {
    const { fields } = mapServerErrors([err('title', 'A.'), err('title', 'B.')], 'generic')
    expect(fields.title).toBe('A. B.')
  })
})

describe('AT-22 server errors: firstInvalid()', () => {
  it('returns the first invalid input in page order, not in error order', () => {
    const errors = { 'metadata.runtime_minutes': 'x', 'price.max': 'y', official_website_url: 'z' }
    expect(firstInvalid(errors, 'movie')).toBe('price.max')
    expect(firstInvalid({ ...errors, title: 'T' }, 'movie')).toBe('title')
  })
  it('is undefined with no errors or only keys of another kind', () => {
    expect(firstInvalid({}, 'movie')).toBeUndefined()
    expect(firstInvalid({ 'metadata.power_hp': 'x' }, 'movie')).toBeUndefined()
  })
  it('streaming inputs come after the other kind fields', () => {
    expect(
      firstInvalid({ 'metadata.streaming.country': 'c', 'metadata.imdb_url': 'i' }, 'movie'),
    ).toBe('metadata.imdb_url')
  })
})
