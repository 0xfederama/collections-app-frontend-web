import { Chip, kindIcons, kindLabels } from '../../components/ui'
import { cx } from '../../lib/cx'
import { ItemThumb } from '../lists/ItemThumb'
import type { SearchResult } from './api'

/** Where a result opens. The shell decides between the side panel and a full page. */
export const resultHref = ({ item }: SearchResult) => `/lists/${item.list_id}/items/${item.id}`

/** `Media › Movies › Watchlist`: the folders and the list that hold the item, muted. */
export function ResultPath({
  path,
  className,
}: {
  path: SearchResult['path']
  className?: string
}) {
  return (
    <span className={cx('block truncate text-text-muted', className)}>
      <span className="sr-only">in </span>
      {path.map((segment) => segment.name).join(' › ')}
    </span>
  )
}

/**
 * Thumb, title and path of a result. `large` is the results page, the default is the dropdown row.
 * Presentational: the caller supplies the link or listbox option around it.
 */
export function SearchResultBody({ result, large }: { result: SearchResult; large?: boolean }) {
  const { item, path } = result
  const KindIcon = kindIcons[item.kind]
  return (
    <>
      {/* The title is written next to the cover, so a real image's alt text would repeat it. */}
      <div aria-hidden className="shrink-0">
        <ItemThumb
          item={item}
          compact={!large}
          className={cx('rounded-sm', large ? 'size-16 md:size-20 md:rounded-md' : 'size-10')}
        />
      </div>
      <span className="min-w-0 flex-1">
        <span
          className={cx('block truncate font-medium text-text', large ? 'text-base' : 'text-sm')}
        >
          {item.title}
        </span>
        <ResultPath path={path} className="text-xs" />
        {large && item.summary && (
          <span className="mt-0.5 line-clamp-1 block text-sm text-text-muted">{item.summary}</span>
        )}
      </span>
      {large && item.status && <Chip>{item.status}</Chip>}
      <span className="inline-flex shrink-0 text-text-muted" title={kindLabels[item.kind]}>
        <KindIcon aria-hidden className="size-4" />
        <span className="sr-only">{kindLabels[item.kind]}</span>
      </span>
    </>
  )
}
