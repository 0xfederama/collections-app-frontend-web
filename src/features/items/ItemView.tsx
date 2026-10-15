import { useState } from 'react'
import { kindIcons, kindLabels } from '../../components/ui'
import { cx } from '../../lib/cx'
import { useItemActions, ItemActions, ItemMenu } from './ItemActions'
import type { Item } from './api'
import { DescriptionField } from './content/DescriptionField'
import { ExternalLinks } from './ExternalLinks'
import { FieldBlock } from './inline/FieldBlock'
import { titleSpec } from './inline/fields'
import { InlineField } from './inline/InlineField'
import { ItemHero } from './ItemHero'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )

/**
 * An item (UI_SPEC §4), top to bottom. Nothing here is a form: every field, the description and
 * the image are edited where they are shown (F-002), each with its own save. In the side sheet
 * (`pinned`) the body scrolls and Move / Delete / Updated stay at the bottom; on the full page
 * they follow the content.
 */
export function ItemView({ item, pinned = false }: { item: Item; pinned?: boolean }) {
  const actions = useItemActions(item)
  const KindIcon = kindIcons[item.kind]
  // "Add website" in the links row asks the details block to open the website editor.
  const [websiteRequest, setWebsiteRequest] = useState(0)
  return (
    <article className={cx('flex flex-col', pinned ? 'min-h-0 flex-1' : 'gap-5')}>
      <div
        className={cx(
          'flex flex-col gap-5',
          pinned && '-mx-6 min-h-0 flex-1 overflow-y-auto px-6 pb-6',
        )}
      >
        <ItemHero item={item} />
        <header className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <KindIcon aria-hidden className="size-3.5" />
              {kindLabels[item.kind]}
            </p>
            <InlineField item={item} spec={titleSpec}>
              <h1 className="text-3xl leading-tight font-bold tracking-tight break-words">
                {item.title}
              </h1>
            </InlineField>
          </div>
          <ItemMenu actions={actions} />
        </header>
        <ExternalLinks item={item} onAddWebsite={() => setWebsiteRequest((n) => n + 1)} />
        <FieldBlock item={item} addWebsiteRequest={websiteRequest} />
        <DescriptionField itemId={item.id} listId={item.list_id} />
      </div>
      <footer
        className={cx(
          'flex flex-col gap-3 border-t border-border',
          pinned ? '-mx-6 shrink-0 px-6 py-3' : 'pt-4',
        )}
      >
        <ItemActions actions={actions} />
        <p className="text-xs text-text-muted">
          Updated <time dateTime={item.updated_at}>{formatDate(item.updated_at)}</time>
        </p>
      </footer>
      {actions.dialogs}
    </article>
  )
}
