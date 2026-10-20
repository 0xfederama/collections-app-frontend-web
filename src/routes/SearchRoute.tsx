import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, EmptyState, Skeleton, TextField } from '../components/ui'
import { Search } from '../components/ui/icons'
import {
  MAX_QUERY_LENGTH,
  normalizeQuery,
  resultHref,
  SearchResultBody,
  useSearchResults,
} from '../features/search'

const URL_DEBOUNCE_MS = 250

/** The URL params with `q` set to the (normalized) query, or removed when it is empty. */
function withQuery(current: URLSearchParams, query: string) {
  const next = new URLSearchParams(current)
  const q = normalizeQuery(query)
  if (q) next.set('q', q)
  else next.delete('q')
  return next
}

function ResultsSkeleton() {
  return (
    <div
      role="status"
      data-testid="search-skeleton"
      className="divide-y divide-border overflow-hidden rounded-lg bg-surface shadow-md"
    >
      <span className="sr-only">Loading results</span>
      {Array.from({ length: 5 }, (_, i) => (
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

/**
 * `/search?q=` (UI_SPEC §1, §6): every match for the query, 50 at a time. The query is URL state:
 * typing updates `?q=` after a pause (replacing the history entry), Enter updates it at once, and
 * back/forward move the field.
 */
export function SearchRoute() {
  const [params, setParams] = useSearchParams()
  const q = normalizeQuery(params.get('q') ?? '')

  const [field, setField] = useState(q)
  useEffect(() => {
    if (normalizeQuery(field) === q) return
    const timer = setTimeout(
      () => setParams((current) => withQuery(current, field), { replace: true }),
      URL_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [field, q, setParams])
  // The URL changed elsewhere (the sidebar search, back/forward): the field follows it.
  const [seenQ, setSeenQ] = useState(q)
  if (q !== seenQ) {
    setSeenQ(q)
    if (normalizeQuery(field) !== q) setField(q)
  }

  const results = useSearchResults(q)
  const rows = results.data?.pages.flatMap((page) => page.data) ?? []
  const total = results.data?.pages[0]?.page.total ?? 0

  let body
  if (!q) {
    body = (
      <EmptyState
        icon={Search}
        title="Search your collection"
        description="Type part of a title to find items in every folder and list."
      />
    )
  } else if (results.isPending) {
    body = <ResultsSkeleton />
  } else if (results.isError) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Couldn’t search.</p>
        <Button variant="secondary" onClick={() => void results.refetch()}>
          Retry
        </Button>
      </div>
    )
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={Search}
        title="No results"
        description={`Nothing has “${q}” in its title. Check the spelling or try a shorter word.`}
      />
    )
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <ul
          aria-label="Search results"
          className="divide-y divide-border overflow-hidden rounded-lg bg-surface shadow-md"
        >
          {rows.map((result) => (
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
        {results.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              onClick={() => void results.fetchNextPage()}
              disabled={results.isFetchingNextPage}
            >
              {results.isFetchingNextPage
                ? 'Loading…'
                : `Load more (${total - rows.length} remaining)`}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <form
        role="search"
        aria-label="Search all items"
        className="max-w-xl [&_label]:sr-only"
        onSubmit={(event) => {
          event.preventDefault()
          setParams((current) => withQuery(current, field), { replace: true })
        }}
      >
        <TextField
          label="Search all items"
          type="search"
          placeholder="Search all items"
          autoComplete="off"
          maxLength={MAX_QUERY_LENGTH}
          value={field}
          onChange={(event) => setField(event.target.value)}
          prefix={<Search aria-hidden className="size-4" />}
        />
      </form>
      {q && total > 0 && (
        <p role="status" className="text-sm text-text-muted">
          {`${total} ${total === 1 ? 'result' : 'results'} for “${q}”`}
        </p>
      )}
      {body}
    </section>
  )
}
