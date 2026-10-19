import { NO_TYPE_LABEL } from '../../components/ui'
import { cx } from '../../lib/cx'
import { ItemThumb } from '../lists/ItemThumb'
import { ListIconMark } from '../lists/ListIconMark'
import type { SearchResult } from './api'
import type { ItemType } from '../items/api'

/** Where a result opens. The shell decides between the side panel and a full page. */
export const resultHref = ({ item }: SearchResult) => `/lists/${item.list_id}/items/${item.id}`

/** `Media › Movies › Watchlist`: the folders and the list that hold the item, muted. */
export function ResultPath({
  path,
  className,
  type = null,
}: {
  path: SearchResult['path']
  className?: string
  type?: ItemType
}) {
  return (
    <span className={cx('block truncate text-text-muted', className)}>
      <span className="sr-only">in </span>
      {path.map((segment) => segment.name).join(' › ')}
      {path.at(-1)?.type === 'list' && (
        <ListIconMark
          icon={path.at(-1)?.icon}
          iconColor={path.at(-1)?.icon_color}
          type={type}
          className="ml-1 inline-grid size-4 align-middle"
          iconClassName="size-3"
        />
      )}
    </span>
  )
}

/**
 * Thumb, title and path of a result. `large` is the results page, the default is the dropdown row.
 * Presentational: the caller supplies the link or listbox option around it.
 */
export function SearchResultBody({ result, large }: { result: SearchResult; large?: boolean }) {
  const { item, path } = result
  return (
    <>
      {/* The title is written next to the cover, so a real image's alt text would repeat it. */}
      <div aria-hidden className="shrink-0">
        <ItemThumb
          item={item}
          className={cx('rounded-sm', large ? 'size-16 md:size-20 md:rounded-md' : 'size-10')}
        />
      </div>
      <span className="min-w-0 flex-1">
        <span
          className={cx('block truncate font-medium text-text', large ? 'text-base' : 'text-sm')}
        >
          {item.title}
        </span>
        <ResultPath path={path} className="text-xs" type={item.type} />
      </span>
      <span
        className="inline-flex shrink-0 text-text-muted"
        title={result.type_name ?? NO_TYPE_LABEL}
      >
        <ListIconMark type={item.type} className="size-5 bg-transparent" iconClassName="size-4" />
        <span className="sr-only">{result.type_name ?? NO_TYPE_LABEL}</span>
      </span>
    </>
  )
}
