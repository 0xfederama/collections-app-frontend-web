import { describe, expect, it } from 'vitest'
import type { Item, ItemKind } from '../api'
import {
  buildPatch,
  draftDump,
  draftFromItem,
  firstInvalid,
  isDirty,
  mapServerErrors,
  normalizePrice,
  validate,
  type Defaults,
  type Draft,
} from './draft'

const defaults: Defaults = { country: 'IT' }
const noDefaults: Defaults = { country: '' }

function makeItem(kind: ItemKind, over: Partial<Item> = {}): Item {
  return {
    id: '7c1e5a10-0000-4000-8000-000000000101',
    list_id: '7c1e5a10-0000-4000-8000-000000000011',
    title: 'Thing',
    kind,
    image: null,
    price: null,
    website: null,
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

  it('limits the website to 2048 characters', () => {
    expect(ok({ website: `https://a.io/${'a'.repeat(2040)}` }).website).toMatch(/2048/)
  })

  describe('price (F007-W8)', () => {
    const single = (text: string, over: Partial<Draft> = {}) =>
      ok({ hasPrice: true, priceMode: 'single', priceAmount: text, currency: 'EUR', ...over })
    const range = (min: string, max: string, over: Partial<Draft> = {}) =>
      ok({
        hasPrice: true,
        priceMode: 'range',
        priceMin: min,
        priceMax: max,
        currency: 'EUR',
        ...over,
      })

    it.each(['12', '12.5', '1299.50', '0', '0.99'])('accepts %s', (text) => {
      expect(single(text)['price.amount']).toBeUndefined()
      expect(range(text, '')['price.min']).toBeUndefined()
      expect(range('', text)['price.max']).toBeUndefined()
    })

    it.each(['1,5', '12.345', '-1', 'abc', '1.', '.5', '12345678901'])('rejects %s', (text) => {
      expect(single(text)['price.amount']).toBeDefined()
      expect(range(text, '')['price.min']).toBeDefined()
      expect(range('', text)['price.max']).toBeDefined()
    })

    it('enforces min <= max with the error on the maximum', () => {
      expect(range('20', '10')['price.max']).toMatch(/lower than the minimum/)
      expect(range('10.01', '10.00')['price.max']).toBeDefined()
      expect(range('10', '10')['price.max']).toBeUndefined()
      expect(range('9.5', '10')['price.max']).toBeUndefined()
    })

    it('accepts a lone minimum or a lone maximum in a range', () => {
      expect(range('5', '')).toEqual({})
      expect(range('', '5')).toEqual({})
    })

    it('checks only the inputs of the chosen mode', () => {
      expect(single('5', { priceMin: 'junk', priceMax: 'junk' })).toEqual({})
      expect(range('5', '6', { priceAmount: 'junk' })).toEqual({})
    })

    it('a malformed currency is an error on the currency input', () => {
      expect(single('5', { currency: 'EU' })['price.currency']).toBeDefined()
    })

    it('without a typed currency the price uses EUR', () => {
      expect(single('5', { currency: '' })['price.currency']).toBeUndefined()
    })

    it('a hidden price is not validated', () => {
      expect(ok({ hasPrice: false, priceAmount: 'junk' })).toEqual({})
    })
  })

  describe('website', () => {
    it.each(['http://example.com', 'https://example.com/a?b=1'])('accepts %s', (url) => {
      expect(ok({ website: url }).website).toBeUndefined()
    })
    it.each(['javascript:alert(1)', 'ftp://x', 'not a url', 'data:text/html,hi'])(
      'rejects %s',
      (url) => {
        expect(ok({ website: url }).website).toBeDefined()
      },
    )
    it('is optional', () => {
      expect(ok({ website: '  ' }).website).toBeUndefined()
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

    it('fuel_type must be one of the options, power_hp allows one decimal', () => {
      expect(check({ fuel_type: 'plugin_hybrid' })).toEqual({})
      expect(check({ fuel_type: 'steam' })['metadata.fuel_type']).toBeDefined()
      expect(check({ power_hp: '110.55' })['metadata.power_hp']).toBeDefined()
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
    expect(
      buildPatch(item, draftOf(item, { website: ' https://matrix.example ' }), defaults),
    ).toEqual({ website: 'https://matrix.example' })
  })

  it('padding spaces are not a change; the title is trimmed when it is', () => {
    const item = movie()
    expect(buildPatch(item, draftOf(item, { title: '  The Matrix  ' }), defaults)).toEqual({})
    expect(buildPatch(item, draftOf(item, { title: '  Neo ' }), defaults)).toEqual({ title: 'Neo' })
  })

  it('2019 and "2019" are the same year', () => {
    const tv = tvShow()
    expect(buildPatch(tv, draftOf(tv, {}, { first_air_year: ' 2019 ' }), defaults)).toEqual({})
  })

  it('clearing the website sends null', () => {
    const item = makeItem('generic', { website: 'https://a.io' } as Partial<Item>)
    expect(buildPatch(item, draftOf(item, { website: '' }), defaults)).toEqual({ website: null })
  })

  describe('price (F007-W8)', () => {
    const priced = (min: string | null, max: string | null, currency = 'EUR') =>
      makeItem('generic', { price: { min, max, currency } } as Partial<Item>)

    it('an item without a price has the price control hidden and sends nothing', () => {
      const item = makeItem('generic')
      expect(draftFromItem(item).hasPrice).toBe(false)
      expect(buildPatch(item, draftFromItem(item), defaults)).toEqual({})
    })

    it('min == max loads as a single price, anything else as a range', () => {
      const single = draftFromItem(priced('1200.00', '1200.00'))
      expect(single).toMatchObject({ hasPrice: true, priceMode: 'single', priceAmount: '1200.00' })
      const range = draftFromItem(priced('1000.00', '1400.00'))
      expect(range).toMatchObject({
        hasPrice: true,
        priceMode: 'range',
        priceMin: '1000.00',
        priceMax: '1400.00',
      })
    })

    it('an open-ended legacy range (one bound) loads as a range', () => {
      expect(draftFromItem(priced('49.90', null))).toMatchObject({
        priceMode: 'range',
        priceMin: '49.90',
        priceMax: '',
      })
      expect(draftFromItem(priced(null, '9.00'))).toMatchObject({
        priceMode: 'range',
        priceMin: '',
        priceMax: '9.00',
      })
    })

    it('an unchanged price sends nothing, whatever its shape', () => {
      for (const item of [
        priced('12.50', '12.50'),
        priced('10.00', '20.00'),
        priced('49.90', null),
      ]) {
        expect(buildPatch(item, draftFromItem(item), defaults)).toEqual({})
      }
    })

    it('"12.5" and "12.50" are the same price', () => {
      const item = priced('12.50', '12.50')
      expect(buildPatch(item, draftOf(item, { priceAmount: '12.5' }), defaults)).toEqual({})
    })

    it('adding a single price sends { amount, currency } with two decimals', () => {
      const item = makeItem('generic')
      const draft = draftOf(item, {
        hasPrice: true,
        priceMode: 'single',
        priceAmount: '1200',
        currency: 'EUR',
      })
      expect(buildPatch(item, draft, defaults)).toEqual({
        price: { amount: '1200.00', currency: 'EUR' },
      })
    })

    it('adding a range sends { min, max, currency }', () => {
      const item = makeItem('generic')
      const draft = draftOf(item, {
        hasPrice: true,
        priceMode: 'range',
        priceMin: '12.5',
        priceMax: '20',
        currency: 'USD',
      })
      expect(buildPatch(item, draft, defaults).price).toEqual({
        min: '12.50',
        max: '20.00',
        currency: 'USD',
      })
    })

    it('a draft currency left empty falls back to EUR', () => {
      const item = makeItem('generic')
      const draft = draftOf(item, { hasPrice: true, priceAmount: '9', currency: '' })
      expect(buildPatch(item, draft, noDefaults).price).toEqual({
        amount: '9.00',
        currency: 'EUR',
      })
    })

    it('Remove price (hasPrice false) sends price: null', () => {
      const item = priced('5.00', '5.00')
      expect(buildPatch(item, draftOf(item, { hasPrice: false }), defaults)).toEqual({
        price: null,
      })
    })

    it('adding and then removing a price sends nothing', () => {
      const item = makeItem('generic')
      const draft = draftOf(item, { hasPrice: false, priceAmount: '5' })
      expect(buildPatch(item, draft, defaults)).toEqual({})
    })

    it('changing only the currency is a change', () => {
      const item = priced('5.00', '5.00')
      expect(buildPatch(item, draftOf(item, { currency: 'USD' }), defaults)).toEqual({
        price: { amount: '5.00', currency: 'USD' },
      })
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
      draftOf(item, {}, { power_hp: '95.5', model_year: '2020' }),
      defaults,
    )
    expect(patch.metadata).toMatchObject({
      power_hp: 95.5,
      model_year: 2020,
      displacement_cc: 937,
    })
  })

  it('never sends a kind (F007-W7)', () => {
    const item = movie()
    const patch = buildPatch(
      item,
      draftOf(item, { title: 'x' }, { runtime_minutes: '1' }),
      defaults,
    )
    expect(patch).not.toHaveProperty('kind')
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
    expect(dump).not.toContain('Release year')
  })

  it('says (cleared) for cleared fields', () => {
    const item = movie()
    const dump = draftDump(item, draftOf(item, {}, { runtime_minutes: '' }), defaults)
    expect(dump).toContain('Runtime: (cleared)')
  })

  it('describes a range, a single price and website changes', () => {
    const item = makeItem('generic')
    const ranged = draftOf(item, {
      hasPrice: true,
      priceMode: 'range',
      priceMin: '5',
      priceMax: '10',
      currency: 'EUR',
      website: 'https://a.io',
    })
    const dump = draftDump(item, ranged, defaults)
    expect(dump).toContain('Price: 5.00–10.00 EUR')
    expect(dump).toContain('Website: https://a.io')
    const single = draftOf(item, { hasPrice: true, priceAmount: '7', currency: 'EUR' })
    expect(draftDump(item, single, defaults)).toContain('Price: 7.00 EUR')
  })

  it('says (cleared) for a removed price', () => {
    const item = makeItem('generic', {
      price: { min: '5.00', max: '5.00', currency: 'EUR' },
    } as Partial<Item>)
    expect(draftDump(item, draftOf(item, { hasPrice: false }), defaults)).toContain(
      'Price: (cleared)',
    )
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

  it('maps price.amount and price.currency onto their inputs', () => {
    const { fields } = mapServerErrors(
      [err('price.amount', 'A'), err('price.currency', 'C')],
      'generic',
    )
    expect(fields).toEqual({ 'price.amount': 'A', 'price.currency': 'C' })
  })

  it('aliases "price" to the amount input, or to the minimum in range mode', () => {
    expect(mapServerErrors([err('price', 'P')], 'generic').fields).toEqual({ 'price.amount': 'P' })
    expect(mapServerErrors([err('price', 'P')], 'generic', 'range').fields).toEqual({
      'price.min': 'P',
    })
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
    const errors = { 'metadata.runtime_minutes': 'x', 'price.max': 'y', website: 'z' }
    expect(firstInvalid(errors, 'movie')).toBe('price.max')
    expect(firstInvalid({ ...errors, title: 'T' }, 'movie')).toBe('title')
    expect(firstInvalid({ website: 'z', 'price.amount': 'a' }, 'movie')).toBe('price.amount')
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
