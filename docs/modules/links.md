# links

## Purpose

Pure URL builders for outside links: an item's external links (Google, IMDb, Goodreads and similar), store links for books and streaming search links for list rows and detail. No I/O and no React; the client builds every link itself.

## Key files

- `src/features/links/index.ts`: public face; imported by items and lists.
- `src/features/links/model/external.ts`: `buildExternalLinks`, `safeWebsiteUrl`, `safeImdbUrl`, `IMDB_URL`.
- `src/features/links/model/stores.ts`: `storeLink`, `amazonDomain`, Amazon domain table per country.
- `src/features/links/model/streaming.ts`: `streamingSearchLink`, `normalizePlatform`, service table.
- `src/features/links/model/favicon.ts`: `faviconUrl` (site icon URL, a stub for now) and `siteHost` (display host).
- `src/features/links/model/*.test.ts`: table-driven tests of each builder.

## Interfaces

- `buildExternalLinks(item): ExternalLink[]`: the per-type link list (movie, TV, book, other).
- `safeWebsiteUrl(url)`, `safeImdbUrl(url)`: return the URL only when it passes the https and IMDb pattern, else `null`.
- `storeLink(provider, { isbn, title, country })`: store URL for a book, or `null`.
- `amazonDomain(country)`: Amazon domain for a country code, `amazon.com` by default.
- `streamingSearchLink(platform, title)`: search page of a known service for the title, or `null`.
- `normalizePlatform(name)`: canonical key for a platform name.
- `faviconUrl(siteUrl)`: the site's icon URL, or `null`. Always `null` until the backend favicon endpoint ships (roadmap 28 TODO).
- `siteHost(siteUrl)`: the host for display (`www.ducati.com`), or `null` when the URL is not http(s).

## Gotchas

- The API's `store_links` and `platform_links` fields are ignored; links are built here (see [architecture](../architecture.md)).
- `stores.ts` keeps `AMAZON_DOMAINS` identical to the backend's Go table; `streaming.ts` ports the backend's streamlinks table with the same escaping.
- Website is never replaced by a search; IMDb falls back to a title search when the stored `imdb_url` is invalid.
- Goodreads and Open Library links search by title, never by ISBN.
- URLs are built with `URLSearchParams` / `encodeURIComponent`, so titles cannot change the URL structure.
- No site has an icon yet, so `SiteIcon` draws the globe. When the endpoint lands, change only `faviconUrl`.
