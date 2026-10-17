import { useState, type ReactNode } from 'react'
import { ServiceIcon } from '../../../components/ServiceIcon'
import { Button, Menu, type MenuItem } from '../../../components/ui'
import { Plus, TriangleAlert } from '../../../components/ui/icons'
import { useSettings } from '../../settings/api'
import { hasPrice } from '../kinds'
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
        <ul aria-label="Platforms" className="flex flex-wrap items-center justify-center gap-2">
          {streaming.platforms.map((name) => (
            <li key={name} className="flex items-center justify-center">
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
 * The detail rows. Populated fields are visible by default; empty fields are added from the menu.
 * A row is edited in place; adding one is local state, never a saved setting.
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
  // A generic item has no kind fields, and only the kinds with a price get the price field (D-085).
  const price = hasPrice(item.kind) ? [priceSpec] : []
  const specs = [...kind, ...price, websiteSpec]
  /** Ids the user added with "+ Add field"; they stay shown until the page is left. */
  const [added, setAdded] = useState<string[]>([])
  const [adding, setAdding] = useState<Adding[]>([])
  const [handledRequest, setHandledRequest] = useState(addWebsiteRequest)
  if (addWebsiteRequest !== handledRequest) {
    setHandledRequest(addWebsiteRequest)
    if (!websiteSpec.isSet(item) && !adding.some((entry) => entry.id === websiteSpec.id))
      setAdding([...adding, { id: websiteSpec.id }])
  }
  /**
   * "+ Add field" on a field that already has a value only reveals it: the user asked to read it.
   * A field still empty opens its editor straight away, since that is what they are there to do.
   */
  const reveal = (spec: FieldSpec, initialDraft?: Partial<Draft>) => {
    setAdded((current) => (current.includes(spec.id) ? current : [...current, spec.id]))
    if (spec.isSet(item)) return
    setAdding((current) => [...current, { id: spec.id, initialDraft }])
  }
  const closed = (id: string) => setAdding((current) => current.filter((entry) => entry.id !== id))
  const isAdding = (spec: FieldSpec) => adding.some((entry) => entry.id === spec.id)
  // A populated field is part of the item detail by default. Empty fields stay in the Add field menu.
  const isShown = (spec: FieldSpec) => spec.isSet(item) || added.includes(spec.id) || isAdding(spec)

  const streamingSpec = specs.find((spec) => spec.id === STREAMING_ID)
  const showStreaming = streamingSpec !== undefined && isShown(streamingSpec)
  const rows = specs.filter((spec) => spec.id !== STREAMING_ID && isShown(spec))
  /** Every field of the kind that is not shown yet, set or not: "+ Add field" offers them all. */
  const offerable = (list: FieldSpec[]) => list.filter((spec) => !isShown(spec))
  const entries = (list: FieldSpec[]): MenuItem[] =>
    offerable(list).map((spec) => ({
      label: spec.label,
      onSelect: () => reveal(spec, spec.id === priceSpec.id ? newPrice() : undefined),
    }))
  const kindEntries = entries(kind)
  const anyEntries = entries([...price, websiteSpec])
  const menu: MenuItem[] = [
    ...kindEntries,
    ...(kindEntries.length > 0 && anyEntries.length > 0 ? [{ type: 'separator' as const }] : []),
    ...anyEntries,
  ]

  if (rows.length === 0 && menu.length === 0 && !showStreaming) return null
  const editor = (spec: FieldSpec, children: ReactNode, barClassName?: string) => (
    <InlineField
      item={item}
      spec={spec}
      startOpen={isAdding(spec)}
      initialDraft={adding.find((entry) => entry.id === spec.id)?.initialDraft}
      onClose={() => closed(spec.id)}
      barClassName={barClassName}
    >
      {children}
    </InlineField>
  )
  return (
    <>
      {showStreaming && streamingSpec && (
        <section aria-labelledby="item-streaming" className="flex flex-col gap-2 text-sm">
          {/* W6: the country lives in Settings, so the heading does not repeat it; it is only named
              when the item's country differs (the note under the platforms). */}
          <h2 id="item-streaming" className="text-sm font-semibold text-text-muted">
            Streaming
          </h2>
          {/* W6: a taller hover bar with even padding around the tiles. */}
          {editor(streamingSpec, <StreamingValue item={item} />, 'min-h-10 py-1')}
        </section>
      )}
      {(rows.length > 0 || menu.length > 0) && (
        <section
          aria-labelledby={rows.length > 0 ? 'item-details' : undefined}
          className="flex flex-col gap-3"
        >
          {rows.length > 0 && (
            <>
              <h2 id="item-details" className="text-sm font-semibold text-text-muted">
                Details
              </h2>
              <dl className="flex flex-col gap-1.5 text-sm">
                {rows.map((spec) => (
                  <div
                    key={spec.id}
                    className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1"
                  >
                    {/* F011-W5: the label takes the same height as the value row, so the name and
                        its value sit on one line instead of drifting apart. */}
                    <dt className="flex min-h-8 min-w-0 items-center text-text-muted">
                      {spec.label}
                    </dt>
                    <dd className="min-w-0">{editor(spec, <Value item={item} spec={spec} />)}</dd>
                  </div>
                ))}
              </dl>
            </>
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
