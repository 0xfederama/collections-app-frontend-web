import { useState } from 'react'
import { Button, Menu, type MenuItem } from '../../../components/ui'
import { Plus, TriangleAlert } from '../../../components/ui/icons'
import { useSettings } from '../../settings/api'
import type { Draft } from '../form/draft'
import type { Item } from '../api'
import { safeImdbUrl } from '../links'
import { InlineField } from './InlineField'
import { kindSpecs, newPrice, priceSpec, websiteSpec, type FieldSpec } from './fields'

type Streaming = { country: string; platforms?: string[]; paid_platforms?: string[] }

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function StreamingValue({ item }: { item: Item }) {
  const settings = useSettings()
  const streaming = (item.metadata as Record<string, unknown>).streaming as Streaming | undefined
  if (!streaming) return null
  const homeCountry = settings.data?.streaming_country_code
  const mismatch = homeCountry && homeCountry !== streaming.country
  const paid = new Set((streaming.paid_platforms ?? []).map((name) => name.toLowerCase()))
  return (
    <div className="flex flex-col gap-1.5">
      <p>
        <span className="text-text-muted">Streaming in {countryName(streaming.country)}: </span>
        {streaming.platforms?.length
          ? streaming.platforms.map((name, index) => (
              <span key={name}>
                {index > 0 && ', '}
                {name}
                {paid.has(name.toLowerCase()) && (
                  <>
                    {' '}
                    <span aria-hidden>$</span>
                    <span className="sr-only"> (paid)</span>
                  </>
                )}
              </span>
            ))
          : 'no platforms listed'}
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
  )
}

function Value({ item, spec }: { item: Item; spec: FieldSpec }) {
  if (spec.id === 'metadata.streaming') return <StreamingValue item={item} />
  if (spec.field?.input === 'imdb_url') {
    const imdb = safeImdbUrl((item.metadata as Record<string, unknown>).imdb_url)
    return imdb ? (
      <a
        href={imdb}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-text underline underline-offset-2"
      >
        IMDb page<span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <span className="text-text-muted">
        {String(spec.text?.(item) ?? 'Not a valid IMDb link')}
      </span>
    )
  }
  return <span className="break-words tabular-nums">{spec.text?.(item)}</span>
}

/** An editor opened from "+ Add field": the spec, and how to start its draft. */
interface Adding {
  id: string
  initialDraft?: Partial<Draft>
}

/**
 * The detail rows: the kind's fields, then price and website. Set ones show their label and value
 * and are edited in place; unset ones are hidden and offered by "+ Add field".
 */
export function FieldBlock({ item }: { item: Item }) {
  const kind = kindSpecs(item.kind)
  const specs = [...kind, priceSpec, websiteSpec]
  const [adding, setAdding] = useState<Adding[]>([])
  const open = (entry: Adding) => setAdding((current) => [...current, entry])
  const closed = (id: string) => setAdding((current) => current.filter((entry) => entry.id !== id))
  const isAdding = (spec: FieldSpec) => adding.some((entry) => entry.id === spec.id)

  const shown = specs.filter((spec) => spec.isSet(item) || isAdding(spec))
  const missing = (list: FieldSpec[]) => list.filter((spec) => !spec.isSet(item) && !isAdding(spec))
  const entries = (list: FieldSpec[]): MenuItem[] =>
    missing(list).flatMap((spec) =>
      spec.id === priceSpec.id
        ? [
            {
              label: 'Price',
              onSelect: () => open({ id: spec.id, initialDraft: newPrice(false) }),
            },
            {
              label: 'Price range',
              onSelect: () => open({ id: spec.id, initialDraft: newPrice(true) }),
            },
          ]
        : [{ label: spec.label, onSelect: () => open({ id: spec.id }) }],
    )
  const kindEntries = entries(kind)
  const anyEntries = entries([priceSpec, websiteSpec])
  const menu: MenuItem[] = [
    ...kindEntries,
    ...(kindEntries.length > 0 && anyEntries.length > 0 ? [{ type: 'separator' as const }] : []),
    ...anyEntries,
  ]

  if (shown.length === 0 && menu.length === 0) return null
  return (
    <section aria-labelledby="item-details" className="flex flex-col gap-3">
      <h2 id="item-details" className="text-sm font-semibold text-text-muted">
        Details
      </h2>
      {shown.length > 0 && (
        <dl className="flex flex-col gap-1.5 text-sm">
          {shown.map((spec) => (
            <div key={spec.id} className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[8rem_1fr]">
              <dt className="text-text-muted">{spec.label}</dt>
              <dd>
                <InlineField
                  item={item}
                  spec={spec}
                  startOpen={isAdding(spec)}
                  initialDraft={adding.find((entry) => entry.id === spec.id)?.initialDraft}
                  onClose={() => closed(spec.id)}
                >
                  <Value item={item} spec={spec} />
                </InlineField>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {menu.length > 0 && (
        <div>
          <Menu
            align="start"
            items={menu}
            trigger={
              <Button variant="secondary" size="sm">
                <Plus aria-hidden className="size-4" />
                Add field
              </Button>
            }
          />
        </div>
      )}
    </section>
  )
}
