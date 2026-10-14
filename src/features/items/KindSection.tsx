import { TriangleAlert } from '../../components/ui/icons'
import { useSettings } from '../settings/api'
import type { Item } from './api'
import { kindRows } from './kinds'

type Streaming = { country: string; platforms?: string[] }

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/**
 * The kind details (UI_SPEC §4 step 5): a definition grid of the set fields with units, plus the
 * IMDb link and streaming platforms for movies and TV shows. Renders nothing when nothing is set.
 */
export function KindSection({ item }: { item: Item }) {
  const settings = useSettings()
  const metadata = item.metadata as Record<string, unknown>
  const rows = kindRows(item.kind, metadata)
  const mediaKind = item.kind === 'movie' || item.kind === 'tv_show'
  const imdb = mediaKind && typeof metadata.imdb_url === 'string' ? metadata.imdb_url : null
  const streaming = mediaKind ? (metadata.streaming as Streaming | undefined) : undefined
  if (rows.length === 0 && !imdb && !streaming) return null

  const homeCountry = settings.data?.streaming_country_code
  const mismatch = streaming && homeCountry && homeCountry !== streaming.country

  return (
    <section aria-labelledby="kind-details" className="flex flex-col gap-3">
      <h2 id="kind-details" className="text-sm font-semibold text-text-muted">
        Details
      </h2>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
          {rows.map((row) => (
            <div key={row.key} className="contents">
              <dt className="text-text-muted">{row.label}</dt>
              <dd className="tabular-nums">{row.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {imdb && (
        <a
          href={imdb}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm text-accent-text underline underline-offset-2"
        >
          IMDb page<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      {streaming && (
        <div className="flex flex-col gap-1.5 text-sm">
          <p>
            <span className="text-text-muted">Streaming in {countryName(streaming.country)}: </span>
            {streaming.platforms?.length ? streaming.platforms.join(', ') : 'no platforms listed'}
          </p>
          {mismatch && (
            <p
              role="note"
              className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg p-2 text-warning-text"
            >
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                This is for {countryName(streaming.country)}, but your streaming country is{' '}
                {countryName(homeCountry)}.
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
