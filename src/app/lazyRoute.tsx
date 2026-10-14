import { lazy, Suspense, type ComponentType } from 'react'
import { Skeleton } from '../components/ui'

/** Placeholder while a route's code loads; the shell around it stays on screen. */
function RouteSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}

/** A route component that is loaded on first render and shows a skeleton meanwhile. */
export function lazyRoute(load: () => Promise<ComponentType>) {
  const Lazy = lazy(async () => ({ default: await load() }))
  return function LazyRoute() {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <Lazy />
      </Suspense>
    )
  }
}
