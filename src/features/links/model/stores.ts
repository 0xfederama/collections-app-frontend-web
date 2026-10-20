// Store links for a book, built in the browser from the same rules as the
// backend (backend/internal/stores/stores.go). Pure: no I/O, no React.
// Keep AMAZON_DOMAINS identical to the Go table.

export type StoreLinkInput = {
  isbn?: string | null
  title?: string | null
  country?: string | null
}

// Country code -> Amazon storefront. Any other country uses amazon.com.
const AMAZON_DOMAINS = new Map<string, string>([
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
])

// Amazon storefront host for a country code (any case, surrounding spaces ignored).
export function amazonDomain(country: string | null | undefined): string {
  return AMAZON_DOMAINS.get((country ?? '').trim().toUpperCase()) ?? 'amazon.com'
}

// Public https URL of the store for the book, or null when the provider is unknown
// or there is nothing to search for. The ISBN (separators removed) is preferred
// over the title, except for Amazon, which searches by title whenever it has one.
export function storeLink(provider: string, input: StoreLinkInput): string | null {
  const isbn = cleanISBN(input.isbn ?? '')
  const title = (input.title ?? '').trim()
  const country = (input.country ?? '').trim().toUpperCase()
  let query = isbn || title
  if (!query) return null
  if (provider === 'amazon' && title) query = title

  switch (provider) {
    case 'bookshop': {
      // Bookshop.org has a US and a UK site only.
      const host = country === 'GB' ? 'uk.bookshop.org' : 'bookshop.org'
      return `https://${host}/search?keywords=${queryEscape(query)}`
    }
    case 'amazon':
      return `https://www.${amazonDomain(country)}/s?k=${queryEscape(query)}`
    case 'apple_books':
      return `https://books.apple.com/search?term=${queryEscape(query)}`
    case 'google_play_books': {
      let link = `https://play.google.com/store/search?q=${queryEscape(query)}&c=books`
      if (country.length === 2) link += `&gl=${country}`
      return link
    }
    case 'kobo':
      return `https://www.kobo.com/search?query=${queryEscape(query)}`
    default:
      return null
  }
}

// Drops the separators people type into an ISBN.
function cleanISBN(value: string): string {
  return value.trim().replace(/[- ]/g, '')
}

// Same output as Go's url.QueryEscape: encodeURIComponent, but the characters it
// leaves bare (! ' ( ) *) are escaped too, and a space is '+'.
function queryEscape(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')
}
