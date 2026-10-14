import { Skeleton } from '../../components/ui'

/** Loading state shaped like the item view: hero, title row, links, text. */
export function ItemSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Loading item</span>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-8 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
