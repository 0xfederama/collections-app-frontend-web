import { Link, useMatch } from 'react-router'
import { Tooltip } from '../../components/ui'
import { Folder } from '../../components/ui/icons'
import { ListIconMark } from '../lists/ListIconMark'
import { cx } from '../../lib/cx'
import { readStored, STORAGE_KEYS, writeStored } from '../../lib/storage'
import { useTreeIndex } from './api'

const itemClass =
  'flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-fill-hover aria-[current]:bg-accent/10 aria-[current]:text-text'

const parseIds = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : undefined

/**
 * The collapsed sidebar's tree: only the top-level entries, as icon buttons. The root folder that
 * contains the open list (at any depth) is highlighted, and so is an open root list. A folder opens
 * the full sidebar with that folder expanded.
 */
export function RailTree({ onOpenFolder }: { onOpenFolder: () => void }) {
  const result = useTreeIndex()
  const activeListId = useMatch({ path: '/lists/:listId', end: false })?.params.listId ?? null
  if (result.status !== 'success' || result.index.nodes.length === 0) return null
  const { index } = result
  const currentRootId = activeListId
    ? (index.ancestorsOf(activeListId)[0]?.id ?? activeListId)
    : null

  const openFolder = (id: string) => {
    const stored = readStored(STORAGE_KEYS.treeExpanded, parseIds, [])
    writeStored(STORAGE_KEYS.treeExpanded, [...new Set([...stored, id])])
    onOpenFolder()
  }

  return (
    <ul aria-label="Top-level folders and lists" className="flex flex-col items-center gap-1">
      {index.nodes.map((node) => {
        const current = node.id === currentRootId
        if (node.kind === 'folder') {
          return (
            <li key={node.id}>
              <Tooltip content={node.folder.name} side="right">
                <button
                  type="button"
                  aria-label={node.folder.name}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => openFolder(node.id)}
                  className={cx(itemClass, 'select-none')}
                >
                  <Folder aria-hidden className="size-5" />
                </button>
              </Tooltip>
            </li>
          )
        }
        return (
          <li key={node.id}>
            <Tooltip content={node.list.name} side="right">
              <Link
                to={`/lists/${node.id}`}
                aria-label={node.list.name}
                aria-current={current ? 'page' : undefined}
                className={itemClass}
              >
                <ListIconMark
                  icon={node.list.icon}
                  iconColor={node.list.icon_color}
                  kind={node.list.kind}
                  className="size-7"
                  iconClassName="size-4"
                />
              </Link>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}
