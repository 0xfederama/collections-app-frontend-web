import { useState } from 'react'
import { Button } from '../../components/ui'
import { cx } from '../../lib/cx'
import { useKinds } from '../settings/api'
import { ListIconMark } from '../lists/ListIconMark'
import { useItemActions, ItemActions } from './ItemActions'
import type { Item } from './api'
import { DescriptionField } from './content/DescriptionField'
import { ExternalLinks } from './ExternalLinks'
import { FieldBlock } from './inline/FieldBlock'
import { titleSpec } from './inline/fields'
import { InlineField } from './inline/InlineField'
import { ItemHero } from './ItemHero'
import { kindDefinition, kindName } from './kinds'
import { ItemSkeleton } from './ItemSkeleton'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )

/**
 * An item (UI_SPEC §4), top to bottom. Nothing here is a form: every field, the description and
 * the image are edited where they are shown (F-002), each with its own save. In the side sheet
 * (`pinned`) the body scrolls and Move / Delete / Updated stay at the bottom; on the full page
 * they follow the content. F009-W4: there is no "…" menu, the footer is where the page ends.
 */
export function ItemView({ item, pinned = false }: { item: Item; pinned?: boolean }) {
  const definitions = useKinds()
  const definition = kindDefinition(definitions.data, item.kind)
  const actions = useItemActions(item)
  // "Add website" in the links row asks the details block to open the website editor.
  const [websiteRequest, setWebsiteRequest] = useState(0)
  if (!definition) {
    if (definitions.isPending) return <ItemSkeleton />
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Couldn’t load this item’s type definition.</p>
        <Button variant="secondary" onClick={() => void definitions.refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  return (
    <article className={cx('flex flex-col', pinned ? 'min-h-0 flex-1' : 'gap-5')}>
      <div
        className={cx(
          'flex flex-col gap-5',
          pinned && '-mx-6 min-h-0 flex-1 overflow-y-auto px-6 pb-6',
        )}
      >
        <ItemHero item={item} />
        {/* One title block (F008-W10): kind label above, then the title, then the links with "+" at
            the end of their line. Move and Delete are not here: they close the page (F009-W4). */}
        <header className="flex flex-col gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <ListIconMark
                icon={definition.default_icon}
                kind={item.kind}
                className="size-5 bg-transparent"
                iconClassName="size-3.5"
              />
              {kindName(definition, item.kind)}
            </p>
            <div className="min-w-0">
              <InlineField item={item} definition={definition} spec={titleSpec}>
                <h1 className="text-2xl leading-tight font-bold tracking-tight break-words sm:text-3xl">
                  {item.title}
                </h1>
              </InlineField>
            </div>
          </div>
          <ExternalLinks item={item} onAddWebsite={() => setWebsiteRequest((n) => n + 1)} />
        </header>
        <FieldBlock item={item} definition={definition} addWebsiteRequest={websiteRequest} />
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
