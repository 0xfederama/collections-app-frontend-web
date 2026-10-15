import { describe, expect, it } from 'vitest'
import { COUNTRY_CODES, countryOptions, currencyOptions } from './iso'

describe('countryOptions', () => {
  it('uses the ISO code as value and "Name (CODE)" as label', () => {
    const italy = countryOptions().find((o) => o.value === 'IT')
    expect(italy).toEqual({ value: 'IT', label: expect.stringMatching(/^Italy \(IT\)$/) })
  })

  it('lists every static code once, sorted by label', () => {
    const options = countryOptions()
    expect(options).toHaveLength(COUNTRY_CODES.length)
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length)
    const labels = options.map((o) => o.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
  })

  it('keeps an unknown selected code so it still displays', () => {
    const options = countryOptions('XX')
    expect(options.some((o) => o.value === 'XX')).toBe(true)
    expect(options).toHaveLength(COUNTRY_CODES.length + 1)
  })

  it('does not duplicate a known selected code', () => {
    expect(countryOptions('IT')).toHaveLength(COUNTRY_CODES.length)
  })
})

describe('currencyOptions', () => {
  it('uses the ISO code as value and "CODE · Name" as label', () => {
    const eur = currencyOptions().find((o) => o.value === 'EUR')
    expect(eur).toEqual({ value: 'EUR', label: expect.stringMatching(/^EUR · Euro$/) })
  })

  it('includes common currencies', () => {
    const values = currencyOptions().map((o) => o.value)
    expect(values).toEqual(expect.arrayContaining(['EUR', 'USD', 'GBP', 'JPY']))
  })

  it('keeps an unknown selected code so it still displays', () => {
    const options = currencyOptions('ZZZ')
    expect(options.find((o) => o.value === 'ZZZ')).toBeDefined()
  })

  it('does not duplicate a known selected code', () => {
    const plain = currencyOptions().length
    expect(currencyOptions('EUR')).toHaveLength(plain)
  })
})
