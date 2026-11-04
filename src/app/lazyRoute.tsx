import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Skeleton } from '../components/ui'

/** Placeholder while a route's code loads; the shell around it stays on screen. */
function RouteSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-1/3" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}

/**
 * A route component that is loaded on first render and shows a skeleton meanwhile. Pass
 * `fallback: null` for an overlay route (Settings), whose placeholder would otherwise show in the
 * page flow under the page behind it.
 */
export function lazyRoute(
  load: () => Promise<ComponentType>,
  { fallback = <RouteSkeleton /> }: { fallback?: ReactNode } = {},
) {
  const Lazy = lazy(async () => ({ default: await load() }))
  return function LazyRoute() {
    return (
      <Suspense fallback={fallback}>
        <Lazy />
      </Suspense>
    )
  }
}
