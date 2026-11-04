import { useLocation, useParams } from 'react-router'
import { PageHeaderSlot } from '../../components/PageHeaderSlot'
import { Skeleton } from '../../components/ui'

/** Loading state shaped like the item view: hero, title row, links, text. On phones it keeps the back control in the header slot. */
export function ItemSkeleton() {
  const { listId } = useParams()
  const { search } = useLocation()
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Loading item</span>
      <div className="flex empty:hidden">
        {listId && (
          <PageHeaderSlot
            back={{ to: { pathname: `/lists/${listId}`, search }, label: 'Back to list' }}
          />
        )}
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
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
