import { describe, expect, it } from 'vitest'
import { amazonDomain, storeLink, type StoreLinkInput } from './stores'

describe('F020-W1 store links', () => {
  it.each([
    ['IT', 'amazon.it'],
    ['DE', 'amazon.de'],
    ['FR', 'amazon.fr'],
    ['ES', 'amazon.es'],
    ['GB', 'amazon.co.uk'],
    ['NL', 'amazon.nl'],
    ['SE', 'amazon.se'],
    ['PL', 'amazon.pl'],
    ['BE', 'amazon.com.be'],
    ['IE', 'amazon.ie'],
    ['CA', 'amazon.ca'],
    ['MX', 'amazon.com.mx'],
    ['BR', 'amazon.com.br'],
    ['AU', 'amazon.com.au'],
    ['JP', 'amazon.co.jp'],
    ['IN', 'amazon.in'],
    ['TR', 'amazon.com.tr'],
    ['AE', 'amazon.ae'],
    ['SA', 'amazon.sa'],
    ['SG', 'amazon.sg'],
    ['EG', 'amazon.eg'],
    ['us', 'amazon.com'],
    ['US', 'amazon.com'],
    ['CH', 'amazon.com'],
    ['', 'amazon.com'],
    [' it ', 'amazon.it'],
    [null, 'amazon.com'],
    [undefined, 'amazon.com'],
  ])('amazonDomain(%j) = %s', (country, want) => {
    expect(amazonDomain(country)).toBe(want)
  })

  it.each<{ name: string; provider: string; input: StoreLinkInput; want: string | null }>([
    {
      name: 'bookshop by isbn',
      provider: 'bookshop',
      input: { isbn: '9780441172719', title: 'Dune' },
      want: 'https://bookshop.org/search?keywords=9780441172719',
    },
    {
      name: 'bookshop by title when no isbn',
      provider: 'bookshop',
      input: { title: 'Dune & Co' },
      want: 'https://bookshop.org/search?keywords=Dune+%26+Co',
    },
    {
      name: 'amazon without a title falls back to the isbn',
      provider: 'amazon',
      input: { isbn: '9780441172719' },
      want: 'https://www.amazon.com/s?k=9780441172719',
    },
    {
      name: 'amazon follows the country',
      provider: 'amazon',
      input: { title: 'Dune', isbn: '9780441172719', country: 'IT' },
      want: 'https://www.amazon.it/s?k=Dune',
    },
    {
      name: 'amazon searches by title even with an isbn',
      provider: 'amazon',
      input: { title: 'Il vecchio e il mare', isbn: '9788804325963' },
      want: 'https://www.amazon.com/s?k=Il+vecchio+e+il+mare',
    },
    {
      name: 'amazon unknown country falls back to .com',
      provider: 'amazon',
      input: { title: 'Dune', country: 'ZZ' },
      want: 'https://www.amazon.com/s?k=Dune',
    },
    {
      name: 'bookshop uses the UK site for GB',
      provider: 'bookshop',
      input: { title: 'Dune', country: 'gb' },
      want: 'https://uk.bookshop.org/search?keywords=Dune',
    },
    {
      name: 'bookshop stays global for other countries',
      provider: 'bookshop',
      input: { title: 'Dune', country: 'IT' },
      want: 'https://bookshop.org/search?keywords=Dune',
    },
    {
      name: 'google play books gets the country',
      provider: 'google_play_books',
      input: { title: 'Dune', country: 'IT' },
      want: 'https://play.google.com/store/search?q=Dune&c=books&gl=IT',
    },
    {
      name: 'kobo and apple stay global with a country',
      provider: 'kobo',
      input: { title: 'Dune', country: 'IT' },
      want: 'https://www.kobo.com/search?query=Dune',
    },
    {
      name: 'amazon title is trimmed',
      provider: 'amazon',
      input: { title: '  Dune  ' },
      want: 'https://www.amazon.com/s?k=Dune',
    },
    {
      name: 'apple books by title',
      provider: 'apple_books',
      input: { title: 'Il nome della rosa' },
      want: 'https://books.apple.com/search?term=Il+nome+della+rosa',
    },
    {
      name: 'google play books keeps the books filter',
      provider: 'google_play_books',
      input: { isbn: '9780441172719', title: 'Dune' },
      want: 'https://play.google.com/store/search?q=9780441172719&c=books',
    },
    {
      name: 'kobo by title',
      provider: 'kobo',
      input: { title: 'Dune' },
      want: 'https://www.kobo.com/search?query=Dune',
    },
    {
      name: 'nothing to search for',
      provider: 'kobo',
      input: { isbn: ' - ', title: '   ' },
      want: null,
    },
    {
      name: 'open library is no longer a store',
      provider: 'openlibrary',
      input: { isbn: '9780441172719', title: 'Dune' },
      want: null,
    },
    {
      name: 'unknown provider',
      provider: 'audible',
      input: { isbn: '9780441172719' },
      want: null,
    },
    {
      name: 'empty input',
      provider: 'bookshop',
      input: {},
      want: null,
    },
    {
      name: 'null fields are empty',
      provider: 'kobo',
      input: { isbn: null, title: null, country: null },
      want: null,
    },
    {
      name: 'isbn separators are removed for the search',
      provider: 'bookshop',
      input: { isbn: '978-0-441-17271-9' },
      want: 'https://bookshop.org/search?keywords=9780441172719',
    },
    {
      name: 'an isbn of spaces only falls back to the title',
      provider: 'kobo',
      input: { isbn: '   ', title: 'Dune' },
      want: 'https://www.kobo.com/search?query=Dune',
    },
    {
      name: 'google play books with a long country code adds no gl',
      provider: 'google_play_books',
      input: { title: 'Dune', country: 'USA' },
      want: 'https://play.google.com/store/search?q=Dune&c=books',
    },
    {
      name: 'escapes & # and spaces',
      provider: 'kobo',
      input: { title: 'C# & Rust: a guide' },
      want: 'https://www.kobo.com/search?query=C%23+%26+Rust%3A+a+guide',
    },
    {
      name: 'escapes quotes',
      provider: 'apple_books',
      input: { title: `Dune's "best"` },
      want: 'https://books.apple.com/search?term=Dune%27s+%22best%22',
    },
    {
      name: 'escapes non-ASCII as UTF-8',
      provider: 'kobo',
      input: { title: 'Il caffè' },
      want: 'https://www.kobo.com/search?query=Il+caff%C3%A8',
    },
    {
      name: 'escapes ! ( ) * and quotes, keeps - _ . ~',
      provider: 'kobo',
      input: { title: "Wow! (really) *yes*'" },
      want: 'https://www.kobo.com/search?query=Wow%21+%28really%29+%2Ayes%2A%27',
    },
    {
      name: 'keeps unreserved characters bare',
      provider: 'kobo',
      input: { title: 'a-b_c.d~e' },
      want: 'https://www.kobo.com/search?query=a-b_c.d~e',
    },
    {
      name: 'escapes / ? = + and %',
      provider: 'kobo',
      input: { title: 'a/b?c=d+e 100%' },
      want: 'https://www.kobo.com/search?query=a%2Fb%3Fc%3Dd%2Be+100%25',
    },
  ])('$name', ({ provider, input, want }) => {
    expect(storeLink(provider, input)).toBe(want)
  })

  it.each(['bookshop', 'amazon', 'apple_books', 'google_play_books', 'kobo'])(
    '%s link is https',
    (provider) => {
      const link = storeLink(provider, { isbn: '9780441172719', title: 'Dune' })
      expect(link).toMatch(/^https:\/\//)
    },
  )
})
