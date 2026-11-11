import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MarkdownView } from '../../../components/markdown'
import { AlertDialog, Button, Drawer, Skeleton, useToast } from '../../../components/ui'
import { ApiError, errorMessage, NetworkError } from '../../../lib/api'
import { contentKeys, itemKeys } from '../../../data/keys'
import { findUser, UserMark, useUsers } from '../../account'
import type { ItemContent } from '../api'
import { useContentVersion, useContentVersions, useRestoreContent } from './api'
import { formatBytes, relativeTime } from './limits'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  listId: string
  /** Version of the content the page is showing: sent as `If-Match` on restore. */
  currentVersion: number
  onRestored?: (content: ItemContent) => void
}

/** Version history (UI_SPEC §4): newest first, read-only preview, restore with confirmation. */
export function HistoryDrawer({
  open,
  onOpenChange,
  itemId,
  listId,
  currentVersion,
  onRestored,
}: Props) {
  const client = useQueryClient()
  const toast = useToast()
  const versions = useContentVersions(itemId, open)
  const [selected, setSelected] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const preview = useContentVersion(itemId, selected)
  const restore = useRestoreContent()
  const users = useUsers()

  const pruned = preview.error instanceof ApiError && preview.error.status === 404

  const select = (version: number) => {
    setSelected(version)
    setProblem(null)
  }

  const refresh = () => {
    void client.invalidateQueries({ queryKey: contentKeys.versions(itemId) })
    void client.invalidateQueries({ queryKey: itemKeys.content(itemId) })
  }

  const doRestore = async () => {
    if (selected === null) return
    setProblem(null)
    try {
      const saved = await restore.mutateAsync({
        itemId,
        listId,
        current: currentVersion,
        version: selected,
      })
      setConfirming(false)
      setSelected(null)
      onOpenChange(false)
      toast({
        kind: 'success',
        title: `Restored version ${selected}`,
        description: `Saved as version ${saved.version}.`,
      })
      onRestored?.(saved)
    } catch (caught) {
      setConfirming(false)
      if (caught instanceof ApiError && caught.status === 412) {
        setProblem(
          'The description changed since you opened it. The list was refreshed; try again.',
        )
        refresh()
      } else if (caught instanceof ApiError && caught.status === 404) {
        setProblem('That version is no longer available (older versions are pruned).')
        refresh()
      } else if (
        caught instanceof NetworkError ||
        (caught instanceof ApiError && caught.status >= 500)
      ) {
        setProblem('The server could not be reached. Nothing was restored.')
      } else {
        setProblem(errorMessage(caught))
      }
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSelected(null)
          setProblem(null)
        }
        onOpenChange(next)
      }}
      title="History"
      description="Earlier versions of the description, newest first."
    >
      {versions.status === 'pending' && <Skeleton className="h-24 w-full" />}
      {versions.status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-2 text-ui">
          <p>The history could not be loaded.</p>
          <Button size="sm" variant="secondary" onClick={() => void versions.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {versions.status === 'success' &&
        (versions.data.length === 0 ? (
          <p className="text-ui text-text-muted">No saved versions yet.</p>
        ) : (
          <ul aria-label="Versions" className="flex flex-col gap-1">
            {versions.data.map((entry) => {
              const author = findUser(users.data, entry.author_user_id)
              return (
                <li key={entry.version}>
                  <button
                    type="button"
                    aria-pressed={selected === entry.version}
                    onClick={() => select(entry.version)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-ui hover:bg-border aria-pressed:border-accent aria-pressed:bg-border pointer-coarse:min-h-11"
                  >
                    <span>
                      Version {entry.version}
                      {entry.version === currentVersion && ' (current)'}
                      <span className="block font-mono text-secondary text-text-muted">
                        <time dateTime={entry.created_at}>{relativeTime(entry.created_at)}</time>
                      </span>
                      {author && (
                        <span className="block text-secondary text-text-muted">
                          by <UserMark user={author} size={16} />
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-secondary text-text-muted">
                      {formatBytes(entry.size_bytes)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ))}

      {problem && (
        <p role="alert" className="text-ui text-danger-text">
          {problem}
        </p>
      )}

      {selected !== null && (
        <section
          aria-label={`Preview of version ${selected}`}
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          {preview.status === 'pending' && <Skeleton className="h-16 w-full" />}
          {pruned && (
            <div role="alert" className="flex flex-col items-start gap-2 text-ui">
              <p>This version is no longer available (older versions are pruned).</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelected(null)
                  void versions.refetch()
                }}
              >
                Refresh the list
              </Button>
            </div>
          )}
          {preview.status === 'error' && !pruned && (
            <div role="alert" className="flex flex-col items-start gap-2 text-ui">
              <p>This version could not be loaded.</p>
              <Button size="sm" variant="secondary" onClick={() => void preview.refetch()}>
                Retry
              </Button>
            </div>
          )}
          {preview.status === 'success' && (
            <>
              {preview.data.body.trim() ? (
                <MarkdownView source={preview.data.body} />
              ) : (
                <p className="text-ui text-text-muted">This version is empty.</p>
              )}
              {selected !== currentVersion && (
                <Button onClick={() => setConfirming(true)}>Restore this version</Button>
              )}
            </>
          )}
        </section>
      )}

      {confirming && selected !== null && (
        <AlertDialog
          open
          title={`Restore version ${selected}?`}
          description="It is saved as a new version. Nothing is lost: the current text stays in the history."
          confirmLabel="Restore this version"
          keepOpen
          pending={restore.isPending}
          onOpenChange={(next) => !next && setConfirming(false)}
          onConfirm={() => void doRestore()}
        />
      )}
    </Drawer>
  )
}
