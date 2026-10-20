import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../../../lib/api'
import type { TypeDefinition, TypeField } from '../api'
import {
  defaultFieldOptions,
  defaultsFromType,
  defaultsPatch,
  errorText,
  fieldTypeWord,
  isDefaultsDirty,
  sameNullableList,
  type TypeDefaultsDraft,
} from './model'

const field = (key: string, label = key): TypeField => ({
  key,
  label,
  type: 'text',
  position: 0,
  is_locked: false,
  version: 1,
})

const typeDef = (overrides: Partial<TypeDefinition> = {}): TypeDefinition => ({
  key: 'wishlist',
  name: 'Wishlist',
  default_icon: 'gift',
  allows_price: false,
  default_sort_field: 'title',
  default_pinned_fields: ['rating'],
  is_locked: false,
  version: 3,
  fields: [field('rating', 'Rating'), field('year', 'Year')],
  ...overrides,
})

/** A draft that equals the saved `typeDef()`: nothing changed. */
const savedDraft = (overrides: Partial<TypeDefaultsDraft> = {}): TypeDefaultsDraft => ({
  typeKey: 'wishlist',
  icon: 'gift',
  allowsPrice: false,
  sortField: 'title',
  pinnedFields: ['rating'],
  ...overrides,
})

const apiError = (init: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ status: 400, code: 'invalid', title: 'Bad request', raw: null, ...init })

describe('F020 types model', () => {
  describe('fieldTypeWord', () => {
    it.each([
      ['text', 'text'],
      ['number', 'number'],
      ['boolean', 'boolean'],
      ['stores', 'Stores'],
    ] as const)('shows %s as %s', (type, word) => {
      expect(fieldTypeWord(type)).toBe(word)
    })
  })

  describe('defaultsFromType', () => {
    it.each([
      ['copies every saved default', typeDef(), savedDraft()],
      [
        'maps missing icon, sort and pins to null',
        typeDef({
          default_icon: undefined,
          default_sort_field: undefined,
          default_pinned_fields: undefined,
        }),
        savedDraft({ icon: null, sortField: null, pinnedFields: null }),
      ],
      [
        'keeps an empty pin list as []',
        typeDef({ default_pinned_fields: [] }),
        savedDraft({ pinnedFields: [] }),
      ],
      [
        'carries the price flag',
        typeDef({ allows_price: true }),
        savedDraft({ allowsPrice: true }),
      ],
    ])('%s', (_label, type, expected) => {
      expect(defaultsFromType(type)).toEqual(expected)
    })
  })

  describe('sameNullableList', () => {
    it.each([
      ['null and null', null, null, true],
      ['null and []', null, [], false],
      ['[] and null', [], null, false],
      ['equal lists', ['a', 'b'], ['a', 'b'], true],
      ['empty lists', [], [], true],
      ['different order', ['a', 'b'], ['b', 'a'], false],
      ['different length', ['a'], ['a', 'b'], false],
      ['different values', ['a'], ['b'], false],
    ] as [string, string[] | null, string[] | null, boolean][])(
      '%s',
      (_label, left, right, same) => {
        expect(sameNullableList(left, right)).toBe(same)
      },
    )
  })

  describe('errorText', () => {
    it.each([
      [
        'a 412 names the conflict',
        apiError({ status: 412, code: 'version_conflict', title: 'Conflict' }),
        'This definition changed while you were editing. Reload the latest version and try again.',
      ],
      [
        'a 412 wins over field errors',
        apiError({
          status: 412,
          code: 'version_conflict',
          title: 'Conflict',
          errors: [{ field: 'name', message: 'Ignored.' }],
        }),
        'This definition changed while you were editing. Reload the latest version and try again.',
      ],
      [
        'field errors are joined',
        apiError({
          status: 422,
          code: 'validation',
          title: 'Invalid',
          errors: [
            { field: 'name', message: 'Name is required.' },
            { field: 'default_sort_field', message: 'Unknown field.' },
          ],
        }),
        'Name is required. Unknown field.',
      ],
      [
        'the detail wins over the title',
        apiError({ status: 409, code: 'conflict', title: 'Conflict', detail: 'Type is in use.' }),
        'Type is in use.',
      ],
      [
        'the title is the fallback',
        apiError({ status: 500, code: 'internal', title: 'Internal error' }),
        'Internal error',
      ],
      [
        'a network failure keeps the draft',
        new NetworkError(),
        'Could not reach the server. Your changes are still here; try again.',
      ],
      [
        'anything else is generic',
        new Error('boom'),
        'Something went wrong. Your changes are still here; try again.',
      ],
    ])('%s', (_label, error, text) => {
      expect(errorText(error)).toBe(text)
    })
  })

  describe('defaultsPatch', () => {
    it.each([
      ['nothing changed', {}, {}],
      ['icon only', { icon: null }, { default_icon: null }],
      ['icon changed to another', { icon: 'star' }, { default_icon: 'star' }],
      ['price toggle only', { allowsPrice: true }, { allows_price: true }],
      ['sort field only', { sortField: null }, { default_sort_field: null }],
      ['pins only', { pinnedFields: ['year'] }, { default_pinned_fields: ['year'] }],
      ['pins reset to null', { pinnedFields: null }, { default_pinned_fields: null }],
      ['pins set to none []', { pinnedFields: [] }, { default_pinned_fields: [] }],
      [
        'reordered pins are a change',
        { pinnedFields: ['rating', 'year'] },
        { default_pinned_fields: ['rating', 'year'] },
      ],
      [
        'several keys together',
        { icon: null, allowsPrice: true, sortField: 'year' },
        { default_icon: null, allows_price: true, default_sort_field: 'year' },
      ],
    ] as [string, Partial<TypeDefaultsDraft>, object][])('%s', (_label, change, patch) => {
      expect(defaultsPatch(typeDef(), savedDraft(change))).toEqual(patch)
    })

    it('sends nothing for a saved definition whose pins are null', () => {
      const type = typeDef({ default_pinned_fields: null })
      expect(defaultsPatch(type, savedDraft({ pinnedFields: null }))).toEqual({})
    })

    it('treats a missing icon and a null icon as the same', () => {
      const type = typeDef({ default_icon: undefined })
      expect(defaultsPatch(type, savedDraft({ icon: null }))).toEqual({})
    })
  })

  describe('isDefaultsDirty', () => {
    it.each([
      ['no type selected', null, savedDraft(), false],
      ['no draft', typeDef(), null, false],
      [
        'a built-in type is never dirty',
        typeDef({ is_locked: true }),
        savedDraft({ allowsPrice: true }),
        false,
      ],
      ['the saved draft is clean', typeDef(), savedDraft(), false],
      ['icon changed', typeDef(), savedDraft({ icon: null }), true],
      ['price changed', typeDef(), savedDraft({ allowsPrice: true }), true],
      ['sort changed', typeDef(), savedDraft({ sortField: null }), true],
      ['pins changed', typeDef(), savedDraft({ pinnedFields: [] }), true],
      ['pin order changed', typeDef(), savedDraft({ pinnedFields: ['year', 'rating'] }), true],
    ] as const)('%s', (_label, selected, draft, dirty) => {
      expect(isDefaultsDirty(selected, draft)).toBe(dirty)
    })
  })

  describe('defaultFieldOptions', () => {
    it.each([
      [
        'fields only when the price is not allowed',
        typeDef(),
        false,
        [
          { value: 'rating', label: 'Rating' },
          { value: 'year', label: 'Year' },
        ],
      ],
      [
        'appends the price when allowed',
        typeDef(),
        true,
        [
          { value: 'rating', label: 'Rating' },
          { value: 'year', label: 'Year' },
          { value: 'price', label: 'Price' },
        ],
      ],
      [
        'a type without fields offers only the price',
        typeDef({ fields: [] }),
        true,
        [{ value: 'price', label: 'Price' }],
      ],
      ['a type without fields and no price offers nothing', typeDef({ fields: [] }), false, []],
      ['no type selected offers nothing', null, true, []],
    ] as const)('%s', (_label, selected, allowsPrice, options) => {
      expect(defaultFieldOptions(selected, allowsPrice)).toEqual(options)
    })
  })
})
