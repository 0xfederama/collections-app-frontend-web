import { useMemo } from 'react'
import { Link, useMatch, useNavigate } from 'react-router'
import { Button, EmptyState, Skeleton, Tree, type TreeRowState } from '../../components/ui'
import { Folder, FolderOpen, Inbox, List } from '../../components/ui/icons'
import { useTreeIndex, type TreeNode } from './api'
import { buildSortable } from './order'
import { TreeEmptyAction, TreeHeaderActions, TreeRowActions } from './slots'
import { TreeActionsContext } from './TreeActionsContext'
import { useTreeDialogs } from './useTreeDialogs'
import { useExpandedFolders } from './useExpandedFolders'

const listPath = (listId: string) => `/lists/${listId}`

/** The folder/list tree of the sidebar: data, expand state, navigation and its four UI states. */
export function SidebarTree() {
  const result = useTreeIndex()
  const index = result.status === 'success' ? result.index : undefined
  const activeListId = useMatch({ path: '/lists/:listId', end: false })?.params.listId ?? null
  const [expanded, setExpanded] = useExpandedFolders(index, activeListId)
  const navigate = useNavigate()
  const { actions, dialogs } = useTreeDialogs({
    // Make sure the folder that just received something is open, so the user sees it.
    onCreatedFolder: (parentId) => {
      if (parentId) setExpanded(new Set(expanded).add(parentId))
    },
  })
  const sortable = useMemo(() => (index ? buildSortable(index.nodes) : undefined), [index])

  return (
    <TreeActionsContext.Provider value={actions}>
      <section
        aria-labelledby="sidebar-tree-heading"
        className="flex min-h-0 flex-1 flex-col gap-1"
      >
        <div className="flex items-center justify-between gap-2 px-2">
          <h2
            id="sidebar-tree-heading"
            className="text-xs font-semibold tracking-wide text-text-muted uppercase"
          >
            Library
          </h2>
          <TreeHeaderActions />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {result.status === 'pending' && <TreeSkeleton />}
          {result.status === 'error' && (
            <div role="alert" className="flex flex-col items-start gap-2 px-2 py-3 text-sm">
              <p>Couldn’t load your lists.</p>
              <Button size="sm" variant="secondary" onClick={result.refetch}>
                Retry
              </Button>
            </div>
          )}
          {index && index.nodes.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="No lists yet"
              description="Create a folder to group lists, or a list to start collecting items."
              action={<TreeEmptyAction />}
            />
          )}
          {index && index.nodes.length > 0 && (
            <Tree
              aria-label="Folders and lists"
              nodes={index.nodes}
              expanded={expanded}
              onExpandedChange={setExpanded}
              selected={activeListId}
              onSelectedChange={(id) => {
                if (index.lists.has(id)) {
                  void navigate(listPath(id))
                } else {
                  const next = new Set(expanded)
                  if (!next.delete(id)) next.add(id)
                  setExpanded(next)
                }
              }}
              sortable={(node) => sortable?.slots.get(node.id)}
              onReorder={actions.applyMove}
              renderRow={(node, state) => <Row node={node} state={state} />}
            />
          )}
        </div>
      </section>
      {dialogs}
    </TreeActionsContext.Provider>
  )
}

function Row({ node, state }: { node: TreeNode; state: TreeRowState }) {
  if (node.kind === 'folder') {
    const Icon = state.expanded ? FolderOpen : Folder
    return (
      <>
        <Icon aria-hidden className="size-4 shrink-0 text-text-muted" />
        <span className="min-w-0 flex-1 truncate">{node.folder.name}</span>
        <TreeRowActions node={node} />
      </>
    )
  }
  const { list } = node
  return (
    <>
      {/* The treeitem handles keyboard focus; the link gives mouse users real-link behaviour
          (middle-click, copy address) and is stopped from also triggering the row's select. */}
      <Link
        to={listPath(list.id)}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span
          aria-hidden
          className="grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-fill shadow-[inset_0_0_0_1px_var(--material-hairline)]"
        >
          <List className="size-3.5 text-text-muted" />
        </span>
        <span className="min-w-0 flex-1 truncate">{list.name}</span>
        <span className="text-xs text-text-muted tabular-nums">
          {list.item_count}
          <span className="sr-only"> items</span>
        </span>
      </Link>
      <TreeRowActions node={node} />
    </>
  )
}

function TreeSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2 px-2 py-1">
      <span className="sr-only">Loading lists</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-7" />
      ))}
    </div>
  )
}
