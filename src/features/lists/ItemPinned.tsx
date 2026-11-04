import { Fragment, type ReactNode } from 'react'
import { ServiceIcon } from '../../components/ServiceIcon'
import { filterOwnedPlatforms, orderPlatforms } from '../../components/serviceIcons/owned'
import { focusRing } from '../../components/ui'
import { cx } from '../../lib/cx'
import type { ItemSummary } from './api'
import { isLowPriorityPin, pinnedPieces, storesOf, streamingOf } from './pinned'
import { sortStoreKeys, storeName, useStoreProviders } from '../stores'
import type { TypeDefinition } from '../items'
import { safeWebsiteUrl, storeLink, streamingSearchLink } from '../links'
import { useSettings } from '../settings'
import { TileStrip } from './TileStrip'

/**
 * A store or streaming tile that opens its page in a new tab. It sits above the row's stretched
 * title link (`relative z-10`), so a click on it never opens the item; without a usable https URL
 * it is the plain tile.
 */
function TileLink({
  href,
  label,
  children,
}: {
  href: string | null
  label: string
  children: ReactNode
}) {
  if (!href) return <>{children}</>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`${label} (opens in a new tab)`}
      aria-label={`${label} (opens in a new tab)`}
      className={`relative z-10 inline-flex rounded-md ${focusRing}`}
    >
      {children}
    </a>
  )
}

/** One placement of the pinned fields: text pieces joined with ` · `, streaming as service icons. */
export function PinnedSlot({
  keys,
  item,
  definition,
  iconSize,
  className,
  nowrap = false,
}: {
  keys: readonly string[]
  item: ItemSummary
  definition: TypeDefinition
  iconSize: number
  className?: string
  /** One line only (compact and medium rows); cards let the parts wrap. */
  nowrap?: boolean
}) {
  const providers = useStoreProviders()
  const settings = useSettings()
  const owned = settings.data?.owned_streaming_services ?? []
  const parts: ReactNode[] = []
  let run: string[] = []
  const flush = () => {
    const pieces = pinnedPieces(run, item, definition)
    if (pieces.length) {
      // Each piece is its own flex item, so the low-priority ones (director, pages) truncate while the
      // rest keep their width (F-025 W9). The run itself never wraps.
      parts.push(
        <span
          key={`t${parts.length}`}
          className="flex min-w-0 items-baseline whitespace-nowrap tabular-nums"
        >
          {pieces.map((piece, index) => (
            <Fragment key={piece.key}>
              {index > 0 && (
                <span aria-hidden className="shrink-0 px-1">
                  ·
                </span>
              )}
              <span
                className={cx('min-w-0', isLowPriorityPin(piece.key) ? 'truncate' : 'shrink-0')}
              >
                {piece.text}
              </span>
            </Fragment>
          ))}
        </span>,
      )
    }
    run = []
  }
  for (const key of keys) {
    // Store links are tiles like streaming; a provider with no logo gets the letter tile.
    if (definition.fields.find((f) => f.key === key)?.type === 'stores') {
      flush()
      const stores = storesOf(item, key)
      const isbn = typeof item.metadata.isbn === 'string' ? item.metadata.isbn : null
      const country = settings.data?.streaming_country_code
      if (stores.length) {
        parts.push(
          <TileStrip
            key={`k${parts.length}`}
            size={iconSize}
            noun="stores"
            tiles={sortStoreKeys(providers.data, stores).map((store) => {
              const label = storeName(providers.data, store)
              const href = storeLink(store, { isbn, title: item.title, country })
              return (
                <TileLink key={store} href={safeWebsiteUrl(href)} label={label}>
                  <ServiceIcon name={store} label={label} size={iconSize} />
                </TileLink>
              )
            })}
          />,
        )
      }
      continue
    }
    if (key !== 'streaming') {
      run.push(key)
      continue
    }
    flush()
    // F-022-W3: a row shows only the services the user owns (none owned = all).
    // Order: the Settings order, paid platforms after the others.
    const services = orderPlatforms(
      filterOwnedPlatforms(streamingOf(item), owned, (s) => s.name),
      owned,
      (s) => s.name,
      (s) => s.paid,
    )
    const streaming = item.metadata.streaming as { link?: string | null } | null | undefined
    // Each service the web knows opens its own search for the title; one without a search falls back
    // to the title's JustWatch page (`streaming.link`), and without either stays plain.
    const justWatch = safeWebsiteUrl(streaming?.link ?? null)
    if (services.length) {
      parts.push(
        <TileStrip
          key={`s${parts.length}`}
          size={iconSize}
          noun="services"
          tiles={services.map((s) => {
            const search = streamingSearchLink(s.name, item.title)
            return (
              <TileLink
                key={s.name}
                href={safeWebsiteUrl(search) ?? justWatch}
                label={search ? `Find on ${s.name}` : `${s.name} on JustWatch`}
              >
                <ServiceIcon name={s.name} paid={s.paid} size={iconSize} />
              </TileLink>
            )
          })}
        />,
      )
    }
  }
  flush()
  if (parts.length === 0) return null
  return (
    <div
      className={cx(
        'flex items-center gap-x-2 gap-y-1',
        nowrap ? 'flex-nowrap' : 'flex-wrap',
        className,
      )}
    >
      {parts}
    </div>
  )
}
