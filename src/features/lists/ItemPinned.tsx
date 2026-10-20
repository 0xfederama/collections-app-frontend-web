import type { ReactNode } from 'react'
import { ServiceIcon } from '../../components/ServiceIcon'
import { focusRing } from '../../components/ui'
import { cx } from '../../lib/cx'
import type { ItemSummary } from './api'
import { pinnedTexts, storesOf, streamingOf } from './pinned'
import { storeName, useStoreProviders } from '../stores'
import type { TypeDefinition } from '../items'
import { safeWebsiteUrl, storeLink, streamingSearchLink } from '../links'
import { useSettings } from '../settings'

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
}: {
  keys: readonly string[]
  item: ItemSummary
  definition: TypeDefinition
  iconSize: number
  className?: string
}) {
  const providers = useStoreProviders()
  const settings = useSettings()
  const parts: ReactNode[] = []
  let run: string[] = []
  const flush = () => {
    const texts = pinnedTexts(run, item, definition)
    if (texts.length) {
      parts.push(
        <span key={`t${parts.length}`} className="whitespace-nowrap tabular-nums">
          {texts.join(' · ')}
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
          <span key={`k${parts.length}`} className="inline-flex flex-wrap items-center gap-1.5">
            {stores.map((store) => {
              const label = storeName(providers.data, store)
              const href = storeLink(store, { isbn, title: item.title, country })
              return (
                <TileLink key={store} href={safeWebsiteUrl(href)} label={label}>
                  <ServiceIcon name={store} label={label} size={iconSize} />
                </TileLink>
              )
            })}
          </span>,
        )
      }
      continue
    }
    if (key !== 'streaming') {
      run.push(key)
      continue
    }
    flush()
    const services = streamingOf(item)
    const streaming = item.metadata.streaming as { link?: string | null } | null | undefined
    // Each service the web knows opens its own search for the title; one without a search falls back
    // to the title's JustWatch page (`streaming.link`), and without either stays plain.
    const justWatch = safeWebsiteUrl(streaming?.link ?? null)
    if (services.length) {
      parts.push(
        <span key={`s${parts.length}`} className="inline-flex items-center gap-1.5">
          {services.map((s) => {
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
        </span>,
      )
    }
  }
  flush()
  if (parts.length === 0) return null
  return <div className={cx('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>{parts}</div>
}
