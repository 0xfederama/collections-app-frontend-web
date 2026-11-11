import { describe, expect, it } from 'vitest'
import { ApiError, NetworkError } from '../../lib/api'
import type { Settings } from './api'
import {
  buildPatch,
  classifySaveFailure,
  draftDump,
  draftFromSettings,
  firstInvalid,
  inputId,
  isFormDirty,
  isDirty,
  isRetentionDirty,
  mapServerErrors,
  validate,
  type SettingsDraft,
} from './form'

const base: Settings = {
  streaming_country_code: 'IT',
  metadata_language: 'en-US',
  lookup_available: true,
  book_lookup_available: true,
  markdown_history_limit: 20,
  trash_retention_days: null,
  preferred_store: 'amazon',
  owned_streaming_services: [],
  version: 4,
}
const draftWith = (over: Partial<SettingsDraft> = {}): SettingsDraft => ({
  ...draftFromSettings(base),
  ...over,
})

describe('AT-14 settings form model', () => {
  it('draftFromSettings uses strings', () => {
    expect(draftFromSettings(base)).toEqual({
      streaming_country_code: 'IT',
      metadata_language: 'en-US',
      markdown_history_limit: '20',
      trash_retention_days: 'off',
      preferred_store: 'amazon',
      owned_streaming_services: [],
    })
  })

  it('an untouched draft is valid, clean and has an empty patch', () => {
    const draft = draftWith()
    expect(validate(draft)).toEqual({})
    expect(isDirty(base, draft)).toBe(false)
    expect(buildPatch(base, draft)).toEqual({})
  })

  it('buildPatch sends only changed fields, history as a number', () => {
    expect(buildPatch(base, draftWith({ markdown_history_limit: '0' }))).toEqual({
      markdown_history_limit: 0,
    })
    expect(buildPatch(base, draftWith({ streaming_country_code: 'FR' }))).toEqual({
      streaming_country_code: 'FR',
    })
    expect(buildPatch(base, draftWith({ metadata_language: 'it-IT' }))).toEqual({
      metadata_language: 'it-IT',
    })
  })

  it('tracks retention drafts independently from the form Save fields', () => {
    expect(buildPatch(base, draftWith({ trash_retention_days: '7' }))).toEqual({})
    expect(isDirty(base, draftWith({ trash_retention_days: 'off' }))).toBe(false)
    const savedRetention = { ...base, trash_retention_days: 30 }
    expect(isDirty(savedRetention, draftWith({ trash_retention_days: 'off' }))).toBe(true)
    expect(isFormDirty(savedRetention, draftWith({ trash_retention_days: 'off' }))).toBe(false)
  })

  describe('history limit bounds', () => {
    it.each(['-1', '201', '1.5', 'abc', '', ' ', '1e2', '+5'])('rejects %j', (text) => {
      expect(
        validate(draftWith({ markdown_history_limit: text })).markdown_history_limit,
      ).toBeDefined()
    })
    it.each(['0', '200', '20', ' 7 '])('accepts %j', (text) => {
      expect(
        validate(draftWith({ markdown_history_limit: text })).markdown_history_limit,
      ).toBeUndefined()
    })
    it('an unparsable limit counts as dirty but is left out of the patch', () => {
      const draft = draftWith({ markdown_history_limit: 'abc' })
      expect(isDirty(base, draft)).toBe(true)
      expect(buildPatch(base, draft)).toEqual({})
    })
  })

  it('rejects empty country and malformed codes', () => {
    expect(validate(draftWith({ streaming_country_code: '' })).streaming_country_code).toBeDefined()
    expect(
      validate(draftWith({ streaming_country_code: 'it' })).streaming_country_code,
    ).toBeDefined()
  })

  it('firstInvalid follows page order', () => {
    expect(firstInvalid({ markdown_history_limit: 'x', streaming_country_code: 'y' })).toBe(
      'streaming_country_code',
    )
    expect(firstInvalid({})).toBeUndefined()
  })

  it('inputId is derived from the API field name', () => {
    expect(inputId('markdown_history_limit')).toBe('settings-markdown-history-limit')
  })

  describe('mapServerErrors', () => {
    it('maps known fields and joins repeated ones', () => {
      const result = mapServerErrors([
        { field: 'markdown_history_limit', message: 'too long' },
        { field: 'markdown_history_limit', message: 'again' },
        { field: 'streaming_country_code', message: 'bad' },
      ])
      expect(result.fields).toEqual({
        markdown_history_limit: 'too long again',
        streaming_country_code: 'bad',
      })
      expect(result.other).toEqual([])
    })
    it('returns unknown fields as plain messages', () => {
      const result = mapServerErrors([
        { field: 'nope', message: 'bad' },
        { field: '', message: 'general' },
      ])
      expect(result.fields).toEqual({})
      expect(result.other).toEqual(['nope: bad', 'general'])
    })
  })

  it('draftDump lists only the changed fields', () => {
    expect(draftDump(base, draftWith())).toBe('')
    expect(draftDump(base, draftWith({ markdown_history_limit: '5' }))).toBe(
      'Description history limit: 5',
    )
  })
})

describe('F016 default store in the settings model', () => {
  it('sends the store only when it differs from the saved one', () => {
    expect(buildPatch(base, draftWith())).toEqual({})
    expect(buildPatch(base, draftWith({ preferred_store: 'kobo' }))).toEqual({
      preferred_store: 'kobo',
    })
  })

  it('counts a store change as a dirty form and lists it in the copied draft', () => {
    const draft = draftWith({ preferred_store: 'bookshop' })
    expect(isDirty(base, draft)).toBe(true)
    expect(isFormDirty(base, draft)).toBe(true)
    expect(draftDump(base, draft)).toBe('Default store: bookshop')
  })

  it('maps a server 422 on preferred_store onto its input', () => {
    expect(
      mapServerErrors([{ field: 'preferred_store', message: 'unknown store' }]).fields,
    ).toEqual({ preferred_store: 'unknown store' })
  })
})

const apiError = (init: {
  status: number
  detail?: string
  errors?: { field: string; message: string }[]
}) => new ApiError({ code: 'invalid', title: 'Title', raw: null, ...init })

describe('F-022-W3 owned streaming services in the settings model', () => {
  const owning = (keys: string[]) => draftWith({ owned_streaming_services: keys })

  it.each<{ why: string; saved: string[]; draft: string[]; patch: object }>([
    { why: 'no change sends nothing', saved: [], draft: [], patch: {} },
    {
      why: 'a list that is ticked sends the keys',
      saved: [],
      draft: ['netflix', 'sky'],
      patch: { owned_streaming_services: ['netflix', 'sky'] },
    },
    {
      why: 'emptying the list sends [] (show every service)',
      saved: ['netflix'],
      draft: [],
      patch: { owned_streaming_services: [] },
    },
    {
      why: 'the same keys in another order are not a change',
      saved: ['netflix', 'sky'],
      draft: ['sky', 'netflix'],
      patch: {},
    },
  ])('$why', ({ saved, draft, patch }) => {
    const stored = { ...base, owned_streaming_services: saved }
    expect(buildPatch(stored, owning(draft))).toEqual(patch)
    expect(isDirty(stored, owning(draft))).toBe(Object.keys(patch).length > 0)
    expect(isFormDirty(stored, owning(draft))).toBe(Object.keys(patch).length > 0)
  })

  it('is part of the Save settings form, never of retention', () => {
    const stored = { ...base, owned_streaming_services: [] }
    const draft = owning(['netflix'])
    expect(isFormDirty(stored, draft)).toBe(true)
    expect(isRetentionDirty(stored, draft)).toBe(false)
  })

  it('lists the chosen services by name in the copied draft, "All services" when empty', () => {
    expect(draftDump(base, owning(['netflix', 'disneyplus']))).toBe(
      'My streaming services: Netflix, Disney+',
    )
    const stored = { ...base, owned_streaming_services: ['netflix'] }
    expect(draftDump(stored, owning([]))).toBe('My streaming services: All services')
  })

  it('maps a 422 on owned_streaming_services onto its input and focuses the Media pane', () => {
    const mapped = mapServerErrors([
      { field: 'owned_streaming_services', message: 'must not repeat a service' },
    ])
    expect(mapped.fields).toEqual({ owned_streaming_services: 'must not repeat a service' })
    expect(firstInvalid(mapped.fields)).toBe('owned_streaming_services')
    expect(inputId('owned_streaming_services')).toBe('settings-owned-streaming-services')
  })
})

describe('F020 save failure classification', () => {
  it.each([
    [
      '412 is a conflict banner',
      apiError({ status: 412 }),
      { failure: { kind: 'conflict' }, fields: null, other: null },
    ],
    [
      '422 with field errors maps them onto inputs and keeps other messages, no banner',
      apiError({
        status: 422,
        errors: [
          { field: 'markdown_history_limit', message: 'too long' },
          { field: 'nope', message: 'bad' },
        ],
      }),
      {
        failure: null,
        fields: { markdown_history_limit: 'too long' },
        other: ['nope: bad'],
      },
    ],
    [
      '422 with only unknown fields gives no input errors, just messages',
      apiError({ status: 422, errors: [{ field: '', message: 'general' }] }),
      { failure: null, fields: {}, other: ['general'] },
    ],
    [
      '422 without field errors is a plain failure with the detail',
      apiError({ status: 422, detail: 'Invalid request' }),
      { failure: { kind: 'other', message: 'Invalid request' }, fields: null, other: null },
    ],
    [
      '422 with an empty error list falls back to the title',
      apiError({ status: 422, errors: [] }),
      { failure: { kind: 'other', message: 'Title' }, fields: null, other: null },
    ],
    [
      '500 is a network failure',
      apiError({ status: 500 }),
      { failure: { kind: 'network' }, fields: null, other: null },
    ],
    [
      '503 is a network failure',
      apiError({ status: 503, detail: 'down' }),
      { failure: { kind: 'network' }, fields: null, other: null },
    ],
    [
      'other API errors show the detail',
      apiError({ status: 404, detail: 'Settings not found' }),
      { failure: { kind: 'other', message: 'Settings not found' }, fields: null, other: null },
    ],
    [
      'other API errors without detail show the title',
      apiError({ status: 400 }),
      { failure: { kind: 'other', message: 'Title' }, fields: null, other: null },
    ],
    [
      'a NetworkError is a network failure',
      new NetworkError(),
      { failure: { kind: 'network' }, fields: null, other: null },
    ],
    [
      'anything else keeps the draft and says so',
      new Error('boom'),
      {
        failure: { kind: 'other', message: 'Something went wrong. Your changes are kept.' },
        fields: null,
        other: null,
      },
    ],
  ])('AT-14 %s', (_label, caught, expected) => {
    expect(classifySaveFailure(caught)).toEqual(expected)
  })
})
