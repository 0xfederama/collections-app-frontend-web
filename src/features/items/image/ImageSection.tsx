import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Button, TextField, useToast } from '../../../components/ui'
import { cx } from '../../../lib/cx'
import { ItemThumb } from '../../lists/ItemThumb'
import type { Item } from '../api'
import { useItemImage } from './api'
import { ACCEPT, checkImageFile, checkImageUrl } from './checks'
import { describeImageError } from './messages'

type Busy =
  { kind: 'upload'; name: string; fraction: number } | { kind: 'url' } | { kind: 'remove' }

/** What the section is showing about the current image. */
function describeCurrent(image: NonNullable<Item['image']>) {
  if (image.source === 'upload') {
    return image.original_filename ? `Uploaded file: ${image.original_filename}` : 'Uploaded file'
  }
  try {
    return `From ${new URL(image.url).host}`
  } catch {
    return 'From an address'
  }
}

/**
 * Set, replace or remove the item's image by drop, file picker or URL (UI_SPEC §4). It lives in
 * `ImageDialog`. Every change is its own request, applied at once, with its own toast. `item` is
 * the item as it is now: its version goes into `If-Match`, and `onChanged` hands back the updated
 * item. `onStale` reports a 412 or 404 so the dialog shows its conflict banner.
 */
export function ImageSection({
  item,
  initialFile = null,
  onChanged,
  onStale,
}: {
  item: Item
  initialFile?: File | null
  onChanged: (updated: Item) => void
  onStale: (kind: 'conflict' | 'gone') => void
}) {
  const toast = useToast()
  const actions = useItemImage(item)
  const [busy, setBusy] = useState<Busy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | undefined>()
  const fileInput = useRef<HTMLInputElement>(null)
  const browse = useRef<HTMLButtonElement>(null)
  const abort = useRef<AbortController | null>(null)
  // Focus can only move to "browse" once it is enabled again, i.e. after the next render.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) browse.current?.focus()
  }, [refocus])

  // Leaving the page cancels an upload in flight.
  useEffect(() => () => abort.current?.abort(), [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled && initialFile) upload(initialFile)
    })
    // A pasted file is a one-time trigger when the dialog mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (
    state: Busy,
    action: 'upload' | 'url' | 'remove',
    request: () => Promise<Item>,
    success: string,
  ) => {
    setBusy(state)
    setError(null)
    try {
      const updated = await request()
      onChanged(updated)
      toast({ kind: 'success', title: success })
      return true
    } catch (caught) {
      if ((caught as { name?: string } | null)?.name === 'AbortError') {
        setError('Upload cancelled. The image was not changed.')
        return false
      }
      const failure = describeImageError(caught, action)
      if (failure.stale) {
        // The dialog's conflict banner says it; a second alert and a toast would repeat it.
        onStale(failure.stale)
        return false
      }
      setError(failure.message)
      toast({ kind: 'error', title: 'Image not changed', description: failure.message })
      return false
    } finally {
      abort.current = null
      setBusy(null)
    }
  }

  const upload = (file: File) => {
    const problem = checkImageFile(file)
    if (problem) return setError(problem)
    const controller = new AbortController()
    abort.current = controller
    void run(
      { kind: 'upload', name: file.name, fraction: 0 },
      'upload',
      () =>
        actions.upload(file, {
          signal: controller.signal,
          onProgress: (fraction) =>
            setBusy((current) => (current?.kind === 'upload' ? { ...current, fraction } : current)),
        }),
      'Image uploaded',
    )
  }

  const pickFiles = (files: FileList | null | undefined) => {
    const first = files?.[0]
    if (!files || !first) return
    if (files.length > 1) return setError('Choose one image at a time.')
    upload(first)
  }

  const applyUrl = async () => {
    const problem = checkImageUrl(url)
    setUrlError(problem ?? undefined)
    setError(null)
    if (problem) return
    const done = await run({ kind: 'url' }, 'url', () => actions.setUrl(url), 'Image address saved')
    if (done) setUrl('')
  }

  const remove = async () => {
    const done = await run({ kind: 'remove' }, 'remove', actions.remove, 'Image removed')
    if (done) setRefocus((n) => n + 1) // the Remove button is gone
  }

  const dragProps = {
    onDragEnter: (event: DragEvent) => {
      event.preventDefault()
      if (!busy) setDragging(true)
    },
    onDragOver: (event: DragEvent) => {
      event.preventDefault() // required for the drop to fire
      if (!busy) setDragging(true)
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      setDragging(false)
      if (!busy) pickFiles(event.dataTransfer.files)
    },
  }

  const uploading = busy?.kind === 'upload' ? busy : null
  const percent = uploading ? Math.round(uploading.fraction * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      {item.image && (
        <div className="flex flex-wrap items-center gap-4">
          <ItemThumb item={item} className="aspect-video w-40 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="text-sm break-all text-text-muted">{describeCurrent(item.image)}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void remove()}
              pending={busy?.kind === 'remove'}
              disabled={busy !== null}
            >
              Remove image
            </Button>
          </div>
        </div>
      )}

      <div
        {...dragProps}
        data-dragging={dragging || undefined}
        className={cx(
          'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors',
          dragging ? 'border-accent bg-accent/10' : 'border-border-strong bg-surface',
        )}
      >
        {uploading ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-2">
            <div
              role="progressbar"
              aria-label={`Uploading ${uploading.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 w-full overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p aria-live="polite" className="break-all text-text-muted">
              {uploading.fraction >= 1
                ? `Processing ${uploading.name}…`
                : `Uploading ${uploading.name}… ${percent}%`}
            </p>
            {uploading.fraction < 1 && (
              <Button size="sm" variant="secondary" onClick={() => abort.current?.abort()}>
                Cancel upload
              </Button>
            )}
          </div>
        ) : (
          <>
            <p>
              Drop an image or{' '}
              <Button
                ref={browse}
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => fileInput.current?.click()}
              >
                browse
              </Button>
            </p>
            <p className="text-xs text-text-muted">JPEG, PNG or WebP, up to 10 MiB.</p>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          aria-label="Choose an image file"
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => {
            pickFiles(event.target.files)
            event.target.value = '' // choosing the same file again must fire a change
          }}
        />
      </div>

      <div className="flex flex-col items-start gap-3">
        <div className="w-full">
          <TextField
            label="Image URL"
            hint="Or use a picture from the web (https:// only)."
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://example.com/photo.jpg"
            value={url}
            error={urlError}
            disabled={busy !== null}
            onChange={(event) => {
              setUrl(event.target.value)
              setUrlError(undefined)
            }}
            // Enter applies the address (and never submits anything around it).
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void applyUrl()
              }
            }}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => void applyUrl()}
          pending={busy?.kind === 'url'}
          disabled={busy !== null}
        >
          Use image URL
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}
