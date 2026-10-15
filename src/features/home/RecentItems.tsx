import { Link } from 'react-router'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { FileText } from '../../components/ui/icons'
import { SearchResultBody, resultHref } from '../search/SearchResultRow'
import { RECENT_LIMIT, useRecentItems } from './api'

function RecentSkeleton() {
  return (
    <div
      role="status"
      className="divide-y divide-border overflow-hidden rounded-lg bg-surface shadow-md"
    >
      <span className="sr-only">Loading recent items</span>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} aria-hidden className="flex items-center gap-3 p-3">
          <Skeleton className="size-16 md:size-20" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** "Recently updated": the latest items across every list, rows like the search results page. */
export function RecentItems() {
  const recent = useRecentItems(RECENT_LIMIT)
  return (
    <section aria-labelledby="home-recent" className="flex flex-col gap-3">
      <h2 id="home-recent" className="text-sm font-semibold text-text-muted">
        Recently updated
      </h2>
      {recent.isPending ? (
        <RecentSkeleton />
      ) : recent.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>Couldn’t load recent items.</p>
          <Button variant="secondary" onClick={() => void recent.refetch()}>
            Retry
          </Button>
        </div>
      ) : recent.data.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No items yet"
          description="Items you add or change show up here, newest first."
        />
      ) : (
        <ul
          aria-label="Recently updated items"
          className="divide-y divide-border overflow-hidden rounded-lg bg-surface shadow-md"
        >
          {recent.data.data.map((result) => (
            <li key={result.item.id} className="bg-surface">
              <Link
                to={resultHref(result)}
                className="flex items-center gap-3 p-3 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
              >
                <SearchResultBody result={result} large />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
