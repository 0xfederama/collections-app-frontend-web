import { describe, expect, it } from 'vitest'
import type { Settings } from './api'
import {
  buildPatch,
  draftDump,
  draftFromSettings,
  firstInvalid,
  inputId,
  isDirty,
  mapServerErrors,
  validate,
  type SettingsDraft,
} from './form'

const base: Settings = {
  workspace_name: 'Our Collection',
  streaming_country_code: 'IT',
  default_currency: 'EUR',
  markdown_history_limit: 20,
  version: 4,
}
const draftWith = (over: Partial<SettingsDraft> = {}): SettingsDraft => ({
  ...draftFromSettings(base),
  ...over,
})

describe('AT-14 settings form model', () => {
  it('draftFromSettings uses strings', () => {
    expect(draftFromSettings(base)).toEqual({
      workspace_name: 'Our Collection',
      streaming_country_code: 'IT',
      default_currency: 'EUR',
      markdown_history_limit: '20',
    })
  })

  it('an untouched draft is valid, clean and has an empty patch', () => {
    const draft = draftWith()
    expect(validate(draft)).toEqual({})
    expect(isDirty(base, draft)).toBe(false)
    expect(buildPatch(base, draft)).toEqual({})
  })

  it('buildPatch sends only changed fields, trimmed, history as a number', () => {
    expect(buildPatch(base, draftWith({ workspace_name: '  Home  ' }))).toEqual({
      workspace_name: 'Home',
    })
    expect(buildPatch(base, draftWith({ markdown_history_limit: '0' }))).toEqual({
      markdown_history_limit: 0,
    })
    expect(
      buildPatch(base, draftWith({ default_currency: 'USD', streaming_country_code: 'FR' })),
    ).toEqual({ default_currency: 'USD', streaming_country_code: 'FR' })
  })

  it('whitespace around the name is not a change', () => {
    expect(isDirty(base, draftWith({ workspace_name: ' Our Collection ' }))).toBe(false)
  })

  describe('workspace name', () => {
    it('rejects empty and whitespace-only', () => {
      expect(validate(draftWith({ workspace_name: '' })).workspace_name).toBeDefined()
      expect(validate(draftWith({ workspace_name: '   ' })).workspace_name).toBeDefined()
    })
    it('accepts 200 characters and rejects 201', () => {
      expect(
        validate(draftWith({ workspace_name: 'a'.repeat(200) })).workspace_name,
      ).toBeUndefined()
      expect(validate(draftWith({ workspace_name: 'a'.repeat(201) })).workspace_name).toBeDefined()
    })
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

  it('rejects empty country and currency, and malformed codes', () => {
    expect(validate(draftWith({ streaming_country_code: '' })).streaming_country_code).toBeDefined()
    expect(
      validate(draftWith({ streaming_country_code: 'it' })).streaming_country_code,
    ).toBeDefined()
    expect(validate(draftWith({ default_currency: '' })).default_currency).toBeDefined()
    expect(validate(draftWith({ default_currency: 'EU' })).default_currency).toBeDefined()
  })

  it('firstInvalid follows page order', () => {
    expect(firstInvalid({ markdown_history_limit: 'x', default_currency: 'y' })).toBe(
      'default_currency',
    )
    expect(firstInvalid({})).toBeUndefined()
  })

  it('inputId is derived from the API field name', () => {
    expect(inputId('markdown_history_limit')).toBe('settings-markdown-history-limit')
  })

  describe('mapServerErrors', () => {
    it('maps known fields and joins repeated ones', () => {
      const result = mapServerErrors([
        { field: 'workspace_name', message: 'too long' },
        { field: 'workspace_name', message: 'again' },
        { field: 'default_currency', message: 'bad' },
      ])
      expect(result.fields).toEqual({
        workspace_name: 'too long again',
        default_currency: 'bad',
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
    expect(
      draftDump(base, draftWith({ workspace_name: 'Home', markdown_history_limit: '5' })),
    ).toBe('Workspace name: Home\nDescription history limit: 5')
  })
})
