import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api'
import { Button, Dialog } from '../../components/ui'
import { itemKeys, useLookupItem, useUpdateItem, type Item } from './api'

export function TmdbItemActions({ item }: { item: Item }) {
  const lookup = useLookupItem()
  const update = useUpdateItem()
  const client = useQueryClient()
  const [confirmRematch, setConfirmRematch] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const metadata = item.metadata as Record<string, unknown>
  const optedOut = metadata.lookup_disabled === true
  const busy = lookup.isPending || update.isPending

  const runLookup = async (mode: 'rematch' | 'refresh') => {
    setMessage(null)
    try {
      const updated = await lookup.mutateAsync({ item, request: { mode } })
      setConfirmRematch(false)
      setMessage(
        updated.version === item.version
          ? 'No match was found. Your item was kept as entered.'
          : mode === 'refresh'
            ? 'Updated from TMDB.'
            : 'Matched with TMDB.',
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 412) {
        setMessage(
          'Someone else changed this item. The latest version is being loaded; review it before trying again.',
        )
        void client.invalidateQueries({ queryKey: itemKeys.detail(item.id) })
      } else if (error instanceof ApiError && error.status === 503) {
        setMessage('TMDB lookup is currently unavailable. Your item was not changed.')
      } else if (error instanceof ApiError && error.status === 404) {
        setMessage('This item no longer exists. Reload the page to continue.')
      } else {
        setMessage('TMDB could not be reached. Your item was not changed; try again.')
      }
    }
  }

  const toggleOptOut = async () => {
    setMessage(null)
    try {
      await update.mutateAsync({
        item,
        patch: { metadata: { ...metadata, lookup_disabled: !optedOut } },
      })
      setMessage(optedOut ? 'Automatic TMDB updates are on.' : 'Automatic TMDB updates are off.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 412) {
        setMessage(
          'Someone else changed this item. The latest version is being loaded; review it before trying again.',
        )
        void client.invalidateQueries({ queryKey: itemKeys.detail(item.id) })
      } else {
        setMessage('The setting could not be changed. Your item was not changed; try again.')
      }
    }
  }

  return (
    <section aria-label="TMDB actions" className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setConfirmRematch(true)}
          disabled={busy}
        >
          Wrong match?
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void runLookup('refresh')}
          disabled={busy || !metadata.tmdb_id}
        >
          Refresh from TMDB
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void toggleOptOut()}
          pending={update.isPending}
          disabled={busy}
        >
          {optedOut ? 'Turn on automatic TMDB updates' : 'Turn off automatic TMDB updates'}
        </Button>
      </div>
      {message && (
        <p role="status" aria-live="polite" className="text-sm text-text-muted">
          {message}
        </p>
      )}
      {lookup.isPending && (
        <p role="status" aria-live="polite" className="text-sm text-text-muted">
          Looking up this item…
        </p>
      )}
      <Dialog
        open={confirmRematch}
        onOpenChange={setConfirmRematch}
        title="Re-match this item?"
        description="TMDB will search using the current title and replace fields it manages. Your item image and any unsaved field drafts are preserved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRematch(false)}>
              Cancel
            </Button>
            <Button onClick={() => void runLookup('rematch')} pending={lookup.isPending}>
              Re-match
            </Button>
          </>
        }
      />
    </section>
  )
}
