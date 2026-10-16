import { useMemo, useRef, useState } from 'react'
import { Button, EmptyState, Skeleton, useToast } from '../../components/ui'
import { Trash2 } from '../../components/ui/icons'
import { useTrash, type RestoreDestination, type RestoreResult, type TrashEntry } from './api'
import { GONE_MESSAGE } from './errors'
import { PurgeDialog } from './PurgeDialog'
import { RestoreToDialog } from './RestoreToDialog'
import { TrashErrorMessage } from './TrashError'
import { TrashRow } from './TrashRow'
import { useRestoreFeedback } from './useRestoreFeedback'

function TrashSkeleton() {
  return (
    <div role="status" data-testid="trash-skeleton" className="flex flex-col gap-3">
      <span className="sr-only">Loading Trash</span>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-md md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-40" />
        </div>
      ))}
    </div>
  )
}

/** `/trash` (UI_SPEC §7, PRODUCT §10): deleted batches, restore, restore to…, delete permanently. */
export function TrashPage() {
  const query = useTrash()
  const toast = useToast()
  const announceRestored = useRestoreFeedback()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [restoreTo, setRestoreTo] = useState<TrashEntry | null>(null)
  const [purging, setPurging] = useState<TrashEntry | null>(null)

  const entries = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data])

  // A removed row takes the focus with it, so send it to the heading.
  const settle = () => {
    setRestoreTo(null)
    setPurging(null)
    headingRef.current?.focus()
  }
  const restored = (
    entry: TrashEntry,
    result: RestoreResult,
    destination?: RestoreDestination,
    description?: string,
  ) => {
    announceRestored(entry, result, destination, description)
    settle()
  }
  const gone = () => {
    toast({ kind: 'info', title: 'Already gone', description: GONE_MESSAGE })
    settle()
  }

  let body
  if (query.isPending) {
    body = <TrashSkeleton />
  } else if (query.isError && !query.data) {
    body = (
      <TrashErrorMessage
        error={{ kind: 'network', message: 'Trash could not be loaded.' }}
        onRetry={() => void query.refetch()}
        pending={query.isFetching}
      />
    )
  } else if (entries.length === 0) {
    // F009-W7: the shared empty state, centred in the content area both ways. The box grows with
    // the section (`min-h-full` below) so `items-center` has room, the content itself is unchanged.
    body = (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Folders, lists and items you delete show up here, so you can restore them."
        />
      </div>
    )
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <TrashRow
              key={entry.id}
              entry={entry}
              entries={entries}
              onRestoreTo={setRestoreTo}
              onPurge={setPurging}
              onRestored={(restoredEntry, result, description) =>
                restored(restoredEntry, result, undefined, description)
              }
            />
          ))}
        </ul>
        {query.isFetchNextPageError && (
          <TrashErrorMessage
            error={{ kind: 'network', message: 'More entries could not be loaded.' }}
            onRetry={() => void query.fetchNextPage()}
            pending={query.isFetchingNextPage}
          />
        )}
        {query.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              pending={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="flex min-h-full max-w-5xl flex-col gap-4">
      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-bold tracking-tight outline-none"
        >
          Trash
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Deleted things wait here until you restore them or delete them permanently.
        </p>
      </div>
      {query.isError && query.data && !query.isFetchNextPageError && (
        <TrashErrorMessage
          error={{ kind: 'network', message: 'Trash could not be refreshed.' }}
          onRetry={() => void query.refetch()}
          pending={query.isFetching}
        />
      )}
      {body}
      {restoreTo && (
        <RestoreToDialog
          entry={restoreTo}
          onClose={() => setRestoreTo(null)}
          onRestored={(result, destination) => restored(restoreTo, result, destination)}
          onGone={gone}
        />
      )}
      {purging && (
        <PurgeDialog
          entry={purging}
          onClose={() => setPurging(null)}
          onDone={(outcome) => {
            if (outcome === 'purged') {
              toast({ kind: 'success', title: `Permanently deleted “${purging.root_name}”` })
              settle()
            } else gone()
          }}
        />
      )}
    </section>
  )
}
