import { lazy, Suspense } from 'react'
import { ItemSkeleton } from '../features/items'
// The item view pulls in the Markdown renderer, so it loads on first use, not with the shell.
const ItemPage = lazy(() => import('../features/items/ItemPage'))

/**
 * `/lists/:listId/items/:itemId`: the item detail (`src/features/items/*`).
 * The shell renders it full page in `main` below 1280 px and in the detail panel at ≥ 1280 px.
 */
export function ItemRoute() {
  return (
    <Suspense fallback={<ItemSkeleton />}>
      <ItemPage />
    </Suspense>
  )
}
