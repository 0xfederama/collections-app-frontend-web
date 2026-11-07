import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../../lib/api'
import { LIMITS } from '../items'
import {
  describeCreateFailure,
  resolveListId,
  sortListChoices,
  validateQuickAdd,
  type Field,
  type QuickAddInput,
} from './model'

const list = (id: string, name: string, updated_at: string) => ({ id, name, updated_at })

describe('F020 quickadd model', () => {
  describe('sortListChoices', () => {
    const newer = list('new', 'Books', '2026-02-01T00:00:00Z')
    const older = list('old', 'Films', '2026-01-01T00:00:00Z')
    const tieB = list('b', 'Beta', '2026-01-15T00:00:00Z')
    const tieA = list('a', 'Alpha', '2026-01-15T00:00:00Z')

    it.each([
      { name: 'empty input', lists: [], expected: [] },
      { name: 'single list', lists: [older], expected: ['old'] },
      { name: 'most recently updated first', lists: [older, newer], expected: ['new', 'old'] },
      { name: 'ties broken by name', lists: [tieB, tieA], expected: ['a', 'b'] },
      {
        name: 'updated_at beats name',
        lists: [tieA, older, newer],
        expected: ['new', 'a', 'old'],
      },
    ])('$name', ({ lists, expected }) => {
      expect(sortListChoices(lists).map((l) => l.id)).toEqual(expected)
    })

    it('returns a new array and leaves the input order alone', () => {
      const input = [older, newer]
      const sorted = sortListChoices(input)
      expect(sorted).not.toBe(input)
      expect(input.map((l) => l.id)).toEqual(['old', 'new'])
    })
  })

  describe('validateQuickAdd', () => {
    const valid: QuickAddInput = {
      title: 'Dune',
      listId: 'list-1',
    }

    it.each<{
      name: string
      input: Partial<QuickAddInput>
      errors: Partial<Record<Field, string>>
      focus: 'title' | null
    }>([
      { name: 'valid input has no errors', input: {}, errors: {}, focus: null },
      {
        name: 'title is trimmed before the blank check',
        input: { title: '   ' },
        errors: { title: 'Enter a title.' },
        focus: 'title',
      },
      {
        name: 'title at the limit is fine',
        input: { title: 'x'.repeat(LIMITS.title) },
        errors: {},
        focus: null,
      },
      {
        name: 'title over the limit',
        input: { title: 'x'.repeat(LIMITS.title + 1) },
        errors: { title: `Use at most ${LIMITS.title} characters.` },
        focus: 'title',
      },
      {
        name: 'no list',
        input: { listId: undefined },
        errors: { list: 'Create a list first.' },
        focus: null,
      },
      {
        name: 'a title error takes the focus over the list error',
        input: { title: '', listId: undefined },
        errors: { title: 'Enter a title.', list: 'Create a list first.' },
        focus: 'title',
      },
    ])('$name', ({ input, errors, focus }) => {
      expect(validateQuickAdd({ ...valid, ...input })).toEqual({ errors, focus })
    })
  })

  describe('resolveListId', () => {
    const lists = [{ id: 'a' }, { id: 'b' }]

    it.each([
      {
        name: 'the picked list wins over the initial one',
        lists,
        picked: 'b',
        initial: 'a',
        expected: 'b',
      },
      {
        name: 'the initial list is used when nothing is picked',
        lists,
        picked: undefined,
        initial: 'b',
        expected: 'b',
      },
      {
        name: 'the first list when nothing is picked or given',
        lists,
        picked: undefined,
        initial: undefined,
        expected: 'a',
      },
      {
        name: 'the initial list missing falls back to the first',
        lists,
        picked: undefined,
        initial: 'zzz',
        expected: 'a',
      },
      {
        name: 'a picked list that is gone is kept as picked (today’s behaviour)',
        lists,
        picked: 'gone',
        initial: 'a',
        expected: 'gone',
      },
      {
        name: 'empty lists, nothing given',
        lists: [],
        picked: undefined,
        initial: 'a',
        expected: undefined,
      },
      {
        name: 'empty lists, a list picked',
        lists: [],
        picked: 'a',
        initial: undefined,
        expected: 'a',
      },
    ])('$name', ({ lists, picked, initial, expected }) => {
      expect(resolveListId(lists, picked, initial)).toBe(expected)
    })
  })

  describe('F-026 W7 describeCreateFailure duplicate_title', () => {
    it.each([
      ['movie', 'This movie is already in this list.'],
      ['book', 'This book is already in this list.'],
      [null, 'An item with this title is already in this list.'],
    ] as const)('%j: inline on the title, no banner', (type, message) => {
      const caught = new ApiError({
        status: 409,
        code: 'duplicate_title',
        title: 'Duplicate',
        raw: undefined,
      })
      expect(describeCreateFailure(caught, type)).toEqual({
        errors: { title: message },
        focus: 'title',
        formError: undefined,
        keepFormError: true,
        lookupUnavailable: false,
      })
    })
  })

  describe('describeCreateFailure', () => {
    const unprocessable = (errors: { field: string; message: string }[]) =>
      new ApiError({ status: 422, code: 'validation', title: 'Invalid', errors, raw: null })

    it.each<{
      name: string
      caught: unknown
      expected: ReturnType<typeof describeCreateFailure>
    }>([
      {
        name: '422 with title and other field errors: other messages in the banner',
        caught: unprocessable([
          { field: 'title', message: 'Title is taken.' },
          { field: 'type', message: 'Unknown type.' },
        ]),
        expected: {
          errors: { title: 'Title is taken.' },
          focus: 'title',
          formError: 'Type: Unknown type.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: '422 with only other field errors: all joined into the banner, no field error',
        caught: unprocessable([
          { field: 'type', message: 'Unknown type.' },
          { field: 'image', message: 'Too big.' },
        ]),
        expected: {
          errors: {},
          focus: null,
          formError: 'Type: Unknown type. Image: Too big.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: '422 with no field errors: the title of the problem is the banner',
        caught: unprocessable([]),
        expected: {
          errors: {},
          focus: null,
          formError: 'Invalid',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: '422 with no field errors but a detail: the detail is the banner',
        caught: new ApiError({
          status: 422,
          code: 'validation_failed',
          title: 'Validation failed',
          detail: 'director is too long',
          raw: null,
        }),
        expected: {
          errors: {},
          focus: null,
          formError: 'director is too long',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: '422 with a title error only: the banner is kept as it is',
        caught: unprocessable([{ field: 'title', message: 'Title is taken.' }]),
        expected: {
          errors: { title: 'Title is taken.' },
          focus: 'title',
          formError: undefined,
          keepFormError: true,
          lookupUnavailable: false,
        },
      },
      {
        name: '422 with two title errors: the first one is shown',
        caught: unprocessable([
          { field: 'title', message: 'First.' },
          { field: 'title', message: 'Second.' },
        ]),
        expected: {
          errors: { title: 'First.' },
          focus: 'title',
          formError: undefined,
          keepFormError: true,
          lookupUnavailable: false,
        },
      },
      {
        name: '409: the list is gone or in Trash',
        caught: new ApiError({ status: 409, code: 'conflict', title: 'Conflict', raw: null }),
        expected: {
          errors: null,
          focus: null,
          formError: 'This list no longer exists or is in Trash.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: 'lookup unavailable (503 upstream_unavailable): no banner text, the lookup alert shows',
        caught: new ApiError({
          status: 503,
          code: 'upstream_unavailable',
          title: 'Unavailable',
          raw: null,
        }),
        expected: {
          errors: null,
          focus: null,
          formError: undefined,
          keepFormError: false,
          lookupUnavailable: true,
        },
      },
      {
        name: 'lookup unavailable (503 lookup_disabled): same as upstream_unavailable',
        caught: new ApiError({
          status: 503,
          code: 'lookup_disabled',
          title: 'Disabled',
          raw: null,
        }),
        expected: {
          errors: null,
          focus: null,
          formError: undefined,
          keepFormError: false,
          lookupUnavailable: true,
        },
      },
      {
        name: 'network error: nothing was created',
        caught: new NetworkError(),
        expected: {
          errors: null,
          focus: null,
          formError: 'The server could not be reached. Nothing was created, so you can try again.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: '500: nothing was created',
        caught: new ApiError({ status: 500, code: 'unknown', title: 'Server error', raw: null }),
        expected: {
          errors: null,
          focus: null,
          formError: 'The server could not be reached. Nothing was created, so you can try again.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: '400 with a detail: the detail is the banner',
        caught: new ApiError({
          status: 400,
          code: 'bad_request',
          title: 'Bad request',
          detail: 'Malformed body.',
          raw: null,
        }),
        expected: {
          errors: null,
          focus: null,
          formError: 'Malformed body.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
      {
        name: 'a plain Error: the generic message',
        caught: new Error('boom'),
        expected: {
          errors: null,
          focus: null,
          formError: 'Something went wrong.',
          keepFormError: false,
          lookupUnavailable: false,
        },
      },
    ])('$name', ({ caught, expected }) => {
      expect(describeCreateFailure(caught)).toEqual(expected)
    })
  })
})
