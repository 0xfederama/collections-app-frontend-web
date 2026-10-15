import { useState } from 'react'
import { kindIcons, kindLabels } from '../../components/ui'
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
 * the image are edited where they are shown (F-002), each with its own save.
 */
export function ItemView({ item }: { item: Item }) {
  const actions = useItemActions(item)
  const KindIcon = kindIcons[item.kind]
  // "Add website" in the links row asks the details block to open the website editor.
  const [websiteRequest, setWebsiteRequest] = useState(0)
  return (
    <article className="flex flex-col gap-5">
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
      <footer className="flex flex-col gap-3 border-t border-border pt-4">
        <ItemActions actions={actions} />
        <p className="text-xs text-text-muted">
          Updated <time dateTime={item.updated_at}>{formatDate(item.updated_at)}</time>
        </p>
      </footer>
      {actions.dialogs}
    </article>
  )
}
