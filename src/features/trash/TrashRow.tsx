import { useState } from 'react'
import { Button, Chip, kindIcons, useToast } from '../../components/ui'
import { Folder, List, TriangleAlert } from '../../components/ui/icons'
import { useRestoreTrash, type RestoreResult, type TrashEntry } from './api'
import { classifyTrashError, type TrashError } from './errors'
import {
  absoluteTime,
  blockedBy,
  blockedReason,
  countsText,
  pathText,
  relativeTime,
  typeLabel,
} from './model'
import { TrashErrorMessage } from './TrashError'

const rootIcons = { folder: Folder, list: List, item: kindIcons.generic! }

export interface TrashRowProps {
  entry: TrashEntry
  /** All loaded entries, to find the entry of a blocking parent. */
  entries: readonly TrashEntry[]
  onRestoreTo: (entry: TrashEntry) => void
  onPurge: (entry: TrashEntry) => void
  /** `restored` is the entry that came back (the row's own, or its parent's). */
  onRestored: (restored: TrashEntry, result: RestoreResult, description?: string) => void
}

/** One deleted batch: table-like from 768 px, a stacked card below. */
export function TrashRow({ entry, entries, onRestoreTo, onPurge, onRestored }: TrashRowProps) {
  const restore = useRestoreTrash()
  const toast = useToast()
  const [error, setError] = useState<{ error: TrashError; retry: () => void } | null>(null)
  const Icon = rootIcons[entry.root_type]
  const blocked = entry.restorable_in_place ? null : blockedBy(entry, entries)
  const name = `“${entry.root_name}”`
  const hidden = <span className="sr-only"> {name}</span>

  /** Restores `target` (this entry, or the parent that blocks it) in place. */
  const restoreInPlace = async (target: TrashEntry) => {
    setError(null)
    try {
      const result = await restore.mutateAsync({ batchId: target.id })
      onRestored(
        target,
        result,
        target.id === entry.id ? undefined : `${name} is still in Trash and can now be restored.`,
      )
    } catch (caught) {
      const classified = classifyTrashError(caught)
      if (classified.kind === 'gone') {
        toast({ kind: 'info', title: 'Already gone', description: classified.message })
      } else if (classified.kind === 'parent_in_trash') {
        // The list was stale: it is refetched, and this row turns into "Restore to…".
        toast({
          kind: 'info',
          title: `Can’t restore ${name} there`,
          description: classified.message,
        })
      } else {
        setError({ error: classified, retry: () => void restoreInPlace(target) })
      }
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-md md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-6 md:gap-y-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-fill text-text-muted">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{entry.root_name}</span>
            <Chip>{typeLabel[entry.root_type]}</Chip>
          </div>
          <p className="truncate text-sm text-text-muted">
            <span className="sr-only">From </span>
            {pathText(entry.former_path)}
          </p>
          {blocked && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-warning-text">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{blockedReason(blocked)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 text-sm md:col-start-1 md:row-start-2 xl:row-start-1 xl:col-start-2">
        <span>{countsText(entry.counts)}</span>
        <time
          dateTime={entry.deleted_at}
          title={absoluteTime(entry.deleted_at)}
          className="text-text-muted"
        >
          <span className="sr-only">Deleted </span>
          {relativeTime(entry.deleted_at)}
        </time>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:col-start-2 md:row-span-2 md:row-start-1 md:flex-col md:items-stretch xl:col-start-3 xl:row-span-1 xl:flex-row xl:items-center xl:justify-end">
        {blocked ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => onRestoreTo(entry)}>
              Restore to…{hidden}
            </Button>
            {blocked.restoreInstead && (
              <Button
                size="sm"
                variant="secondary"
                pending={restore.isPending}
                onClick={() => void restoreInPlace(blocked.restoreInstead!)}
              >
                Restore “{blocked.restoreInstead.root_name}” instead
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" pending={restore.isPending} onClick={() => void restoreInPlace(entry)}>
            Restore{hidden}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-danger-text"
          onClick={() => onPurge(entry)}
        >
          Delete permanently{hidden}
        </Button>
      </div>

      {error && (
        <div className="md:col-span-2 xl:col-span-3">
          <TrashErrorMessage
            error={error.error}
            pending={restore.isPending}
            onRetry={error.retry}
          />
        </div>
      )}
    </li>
  )
}
