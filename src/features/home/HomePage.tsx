import { EmptyState, Button } from '../../components/ui'
import { ListPlus } from '../../components/ui/icons'
import { useTreeIndex, useTreeDialogs } from '../tree'
import { QuickLinks, QuickLinksError, QuickLinksSkeleton } from './QuickLinks'
import { RecentItems } from './RecentItems'

/** `/` (UI_SPEC §1): quick links to the lists, then the recently updated items. */
export function HomePage() {
  const tree = useTreeIndex()
  // Own copy of the create dialogs, like `ListActionsMenu`: the sidebar's live in the sidebar.
  const { actions, dialogs } = useTreeDialogs()
  const noLists = tree.status === 'success' && tree.index.lists.size === 0
  const hasNothing = noLists && tree.index.folders.size === 0

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Home</h1>
      {noLists ? (
        <EmptyState
          icon={ListPlus}
          title="Create your first list"
          description={
            hasNothing
              ? 'A list holds your items, like movies to watch or gear you own. Start with one.'
              : 'Your folders have no lists yet. Add a list to start collecting.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => actions.createList(null)}>New list</Button>
              <Button variant="secondary" onClick={() => actions.createFolder(null)}>
                New folder
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section aria-labelledby="home-lists" className="flex flex-col gap-3">
            <h2 id="home-lists" className="text-sm font-semibold text-text-muted">
              Your lists
            </h2>
            {tree.status === 'pending' ? (
              <QuickLinksSkeleton />
            ) : tree.status === 'error' ? (
              <QuickLinksError onRetry={tree.refetch} />
            ) : (
              <QuickLinks index={tree.index} />
            )}
          </section>
          <RecentItems />
        </>
      )}
      {dialogs}
    </div>
  )
}
