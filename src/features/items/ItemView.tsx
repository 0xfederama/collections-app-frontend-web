import { MarkdownView } from '../../components/markdown'
import { Badge, Button, Chip } from '../../components/ui'
import { formatPrice } from '../lists/price'
import { useState } from 'react'
import { useItemContent, type Item } from './api'
import { HistoryDrawer } from './content/HistoryDrawer'
import { ExternalLinks } from './ExternalLinks'
import { ItemActions } from './ItemActions'
import { ItemHero } from './ItemHero'
import { KindSection } from './KindSection'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )

function Description({ itemId, listId }: { itemId: string; listId: string }) {
  const content = useItemContent(itemId)
  const [historyOpen, setHistoryOpen] = useState(false)
  return (
    <section aria-labelledby="item-description" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="item-description" className="text-sm font-semibold text-text-muted">
          Description
        </h2>
        {content.status === 'success' && (
          <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>
            History
          </Button>
        )}
      </div>
      {content.status === 'success' && (
        <HistoryDrawer
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          itemId={itemId}
          listId={listId}
          currentVersion={content.data.version}
        />
      )}
      {content.status === 'pending' && (
        <p role="status" className="text-sm text-text-muted">
          Loading description…
        </p>
      )}
      {content.status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p>The description could not be loaded.</p>
          <Button size="sm" variant="secondary" onClick={() => void content.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {content.status === 'success' &&
        (content.data.body.trim() ? (
          <MarkdownView source={content.data.body} />
        ) : (
          <p className="text-sm text-text-muted">No description yet.</p>
        ))}
    </section>
  )
}

/** View mode of an item (UI_SPEC §4), top to bottom. */
export function ItemView({ item }: { item: Item }) {
  const price = formatPrice(item.price)
  return (
    <article className="flex flex-col gap-5">
      <ItemHero item={item} />
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl leading-tight font-semibold break-words">
          {item.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind={item.kind} />
          {item.status && <Chip>{item.status}</Chip>}
          {price && <span className="text-sm font-medium tabular-nums">{price}</span>}
        </div>
      </header>
      <ExternalLinks item={item} />
      {item.summary && <p className="text-text-muted">{item.summary}</p>}
      <KindSection item={item} />
      <Description itemId={item.id} listId={item.list_id} />
      <footer className="flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-xs text-text-muted">
          Created <time dateTime={item.created_at}>{formatDate(item.created_at)}</time> · Updated{' '}
          <time dateTime={item.updated_at}>{formatDate(item.updated_at)}</time>
        </p>
        <ItemActions item={item} />
      </footer>
    </article>
  )
}
