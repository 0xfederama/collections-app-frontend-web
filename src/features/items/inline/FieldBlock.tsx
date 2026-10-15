import { useState } from 'react'
import { ServiceIcon } from '../../../components/ServiceIcon'
import { Button, Menu, type MenuItem } from '../../../components/ui'
import { Plus, TriangleAlert } from '../../../components/ui/icons'
import { useSettings } from '../../settings/api'
import type { Draft } from '../form/draft'
import type { Item } from '../api'
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
      {streaming.platforms?.length ? (
        <ul aria-label="Platforms" className="flex flex-wrap items-center gap-2">
          {streaming.platforms.map((name) => (
            <li key={name}>
              <ServiceIcon name={name} paid={paid.has(name.toLowerCase())} />
            </li>
          ))}
        </ul>
      ) : (
        <span>no platforms listed</span>
      )}
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

const STREAMING_ID = 'metadata.streaming'

function Value({ item, spec }: { item: Item; spec: FieldSpec }) {
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
export function FieldBlock({
  item,
  addWebsiteRequest = 0,
}: {
  item: Item
  /** A counter: each increase opens the website editor (the links row's "Add website"). */
  addWebsiteRequest?: number
}) {
  const kind = kindSpecs(item.kind)
  // A generic item has no price and no kind fields (F008-W14).
  const isGeneric = item.kind === 'generic'
  const specs = isGeneric ? [websiteSpec] : [...kind, priceSpec, websiteSpec]
  const [adding, setAdding] = useState<Adding[]>([])
  const [handledRequest, setHandledRequest] = useState(addWebsiteRequest)
  if (addWebsiteRequest !== handledRequest) {
    setHandledRequest(addWebsiteRequest)
    if (!websiteSpec.isSet(item) && !adding.some((entry) => entry.id === websiteSpec.id))
      setAdding([...adding, { id: websiteSpec.id }])
  }
  const open = (entry: Adding) => setAdding((current) => [...current, entry])
  const closed = (id: string) => setAdding((current) => current.filter((entry) => entry.id !== id))
  const isAdding = (spec: FieldSpec) => adding.some((entry) => entry.id === spec.id)

  const streamingSpec = specs.find((spec) => spec.id === STREAMING_ID)
  const streamingData = (item.metadata as Record<string, unknown>).streaming as
    Streaming | undefined
  const shown = specs.filter(
    (spec) => spec.id !== STREAMING_ID && (spec.isSet(item) || isAdding(spec)),
  )
  const showStreaming = streamingSpec && (streamingSpec.isSet(item) || isAdding(streamingSpec))
  const missing = (list: FieldSpec[]) => list.filter((spec) => !spec.isSet(item) && !isAdding(spec))
  const entries = (list: FieldSpec[]): MenuItem[] =>
    missing(list).flatMap((spec) =>
      spec.id === priceSpec.id
        ? [{ label: spec.label, onSelect: () => open({ id: spec.id, initialDraft: newPrice() }) }]
        : [{ label: spec.label, onSelect: () => open({ id: spec.id }) }],
    )
  const kindEntries = entries(kind)
  const anyEntries = entries(isGeneric ? [websiteSpec] : [priceSpec, websiteSpec])
  const menu: MenuItem[] = [
    ...kindEntries,
    ...(kindEntries.length > 0 && anyEntries.length > 0 ? [{ type: 'separator' as const }] : []),
    ...anyEntries,
  ]

  if (shown.length === 0 && menu.length === 0 && !showStreaming) return null
  return (
    <>
      {showStreaming && (
        <section aria-labelledby="item-streaming" className="flex flex-col gap-2 text-sm">
          <h2 id="item-streaming" className="text-sm font-semibold text-text-muted">
            Streaming{streamingData?.country ? ` · ${countryName(streamingData.country)}` : ''}
          </h2>
          <InlineField
            item={item}
            spec={streamingSpec}
            startOpen={isAdding(streamingSpec)}
            initialDraft={adding.find((entry) => entry.id === streamingSpec.id)?.initialDraft}
            onClose={() => closed(streamingSpec.id)}
          >
            <StreamingValue item={item} />
          </InlineField>
        </section>
      )}
      {(shown.length > 0 || menu.length > 0) && (
        <section aria-labelledby="item-details" className="flex flex-col gap-3">
          <h2 id="item-details" className="text-sm font-semibold text-text-muted">
            Details
          </h2>
          {shown.length > 0 && (
            <dl className="flex flex-col gap-1.5 text-sm">
              {shown.map((spec) => (
                <div
                  key={spec.id}
                  className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)]"
                >
                  <dt className="text-text-muted">{spec.label}</dt>
                  <dd className="min-w-0">
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
      )}
    </>
  )
}
