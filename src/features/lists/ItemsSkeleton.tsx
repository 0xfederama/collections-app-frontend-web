import { Skeleton } from '../../components/ui'
import type { DisplayMode } from './api'

/** Container classes per mode. Grid: 2 columns on mobile, 3 on tablet, then auto-fill (UI_SPEC §2). */
export const containerClass: Record<DisplayMode, string> = {
  compact: 'flex flex-col gap-1.5',
  thumbnail: 'flex flex-col gap-1.5',
  grid: 'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-[repeat(auto-fill,minmax(11.25rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))]',
}

export function ItemsSkeleton({ mode }: { mode: DisplayMode }) {
  const count = mode === 'grid' ? 6 : 5
  return (
    <div role="status" data-testid="items-skeleton" className={containerClass[mode]}>
      <span className="sr-only">Loading items</span>
      {Array.from({ length: count }, (_, i) =>
        mode === 'grid' ? (
          <div
            key={i}
            aria-hidden
            className="flex flex-col gap-2 rounded-lg border border-border p-0"
          >
            <Skeleton className="aspect-4/3 w-full rounded-b-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ) : mode === 'thumbnail' ? (
          // Medium rows: a 36 × 50 tile, two text lines, a hairline divider (F021).
          <div
            key={i}
            aria-hidden
            className="flex items-center gap-3.5 rounded-md border border-border py-1.5 pr-3 pl-1.5"
          >
            <Skeleton className="aspect-[36/50] w-9 shrink-0 rounded-sm" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ) : (
          <div
            key={i}
            aria-hidden
            className="flex items-center gap-3 rounded-md border border-border p-1.5"
          >
            <Skeleton className="size-9" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ),
      )}
    </div>
  )
}
