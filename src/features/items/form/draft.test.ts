import { describe, expect, it } from 'vitest'
import type { Item } from '../api'
import type { TypeDefinition } from '../types'
import { draftFromItem } from './draft'
import { draftDump } from './dump'
import { buildPatch, toFields } from './patch'
import { mapServerErrors } from './serverErrors'
import { validate } from './validate'

const definition: TypeDefinition = {
  key: 'board_game',
  name: 'Board game',
  default_icon: null,
  allows_price: false,
  default_sort_field: 'rating',
  is_locked: false,
  version: 1,
  fields: [
    { key: 'notes', label: 'Notes', type: 'text', position: 0, is_locked: false, version: 1 },
    { key: 'rating', label: 'Rating', type: 'number', position: 1, is_locked: false, version: 1 },
    {
      key: 'played_on',
      label: 'Played on',
      type: 'date',
      position: 2,
      is_locked: false,
      version: 1,
    },
    {
      key: 'recommended',
      label: 'Recommended',
      type: 'boolean',
      position: 3,
      is_locked: false,
      version: 1,
    },
    { key: 'rules', label: 'Rules', type: 'link', position: 4, is_locked: false, version: 1 },
  ],
}

const item: Item = {
  id: 'i1',
  list_id: 'l1',
  title: 'Brass',
  type: definition.key,
  image: null,
  price: null,
  website: null,
  metadata: {
    notes: 'Two players',
    rating: 8.5,
    played_on: '2026-10-19',
    recommended: false,
    rules: 'https://example.com/rules',
  },
  content_version: 0,
  sort_order: 0,
  version: 3,
  created_at: '2026-10-19T00:00:00Z',
  updated_at: '2026-10-19T00:00:00Z',
}

const defaults = { country: 'IT' }

describe('F014-W3 definition-backed item drafts', () => {
  it('round-trips all five custom field types without a patch', () => {
    const draft = draftFromItem(item, definition)
    expect(draft.meta).toEqual({
      notes: 'Two players',
      rating: '8.5',
      played_on: '2026-10-19',
      recommended: 'false',
      rules: 'https://example.com/rules',
    })
    expect(buildPatch(item, draft, defaults)).toEqual({})
  })

  it('converts number and boolean inputs to their wire types', () => {
    const draft = draftFromItem(item, definition)
    draft.meta.rating = '9.25'
    draft.meta.recommended = 'true'
    expect(toFields(draft, defaults).metadata).toMatchObject({ rating: 9.25, recommended: true })
    expect(buildPatch(item, draft, defaults)).toEqual({
      metadata: { ...item.metadata, rating: 9.25, recommended: true },
    })
  })

  it('validates malformed number, date, boolean and link values locally', () => {
    const draft = draftFromItem(item, definition)
    Object.assign(draft.meta, {
      rating: 'eight',
      played_on: '2026-02-31',
      recommended: 'maybe',
      rules: 'javascript:alert(1)',
    })
    expect(validate(draft, defaults)).toMatchObject({
      'metadata.rating': 'Enter a number.',
      'metadata.played_on': 'Enter a valid date.',
      'metadata.recommended': 'Choose yes or no.',
      'metadata.rules': 'Enter a web address beginning with http:// or https://.',
    })
  })

  it('maps server errors only to fields present in the loaded definition', () => {
    const mapped = mapServerErrors(
      [
        { field: 'metadata.rating', message: 'Too high.' },
        { field: 'metadata.unknown', message: 'Unknown.' },
      ],
      definition.fields,
    )
    expect(mapped.fields).toEqual({ 'metadata.rating': 'Too high.' })
    expect(mapped.other).toEqual(['metadata.unknown: Unknown.'])
  })

  it('uses the API type and field labels in the conflict-copy text', () => {
    const draft = draftFromItem(item, definition)
    draft.meta.rating = '9'
    expect(draftDump(item, draft, defaults)).toContain('Board game details:\n  Rating: 9')
  })
})

describe('F016-W4 the stores field in the item draft', () => {
  const bookDefinition: TypeDefinition = {
    key: 'book',
    name: 'Book',
    default_icon: null,
    allows_price: true,
    default_sort_field: null,
    is_locked: true,
    version: 1,
    fields: [
      {
        key: 'stores',
        label: 'Where to get it',
        type: 'stores',
        position: 0,
        is_locked: true,
        version: 1,
      },
    ],
  }
  const book: Item = {
    ...item,
    type: 'book',
    metadata: {
      stores: ['amazon', 'kobo'],
      store_links: { amazon: 'https://www.amazon.com/s?k=Dune' },
    },
  }

  it('F016-W4 reads the saved keys as one comma-separated text, the editor starts from it', () => {
    expect(draftFromItem(book, bookDefinition).meta.stores).toBe('amazon, kobo')
  })

  it('F016-W4 sends the keys as a list, and omits the field when none is chosen', () => {
    const draft = draftFromItem(book, bookDefinition)
    expect(
      toFields({ ...draft, meta: { stores: 'kobo, bookshop, kobo' } }, defaults).metadata,
    ).toEqual({
      stores: ['kobo', 'bookshop'],
    })
    expect(toFields({ ...draft, meta: { stores: ' , ' } }, defaults).metadata).toEqual({})
  })

  it('F016-W4 a change to the stores sends the whole metadata, without store_links', () => {
    const draft = draftFromItem(book, bookDefinition)
    expect(buildPatch(book, { ...draft, meta: { stores: 'amazon' } }, defaults)).toEqual({
      metadata: { stores: ['amazon'] },
    })
  })
})
