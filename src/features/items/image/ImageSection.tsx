import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Button, TextField, useToast } from '../../../components/ui'
import { cx } from '../../../lib/cx'
import type { Item } from '../api'
import { useItemImage } from './api'
import { ACCEPT, checkImageFile, checkImageUrl } from './checks'
import { describeImageError } from './messages'
import { CurrentImage, UploadProgress, type Busy } from './ImageStatus'

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
  const pastedUploadStarted = useRef(false)
  // Focus can only move to "browse" once it is enabled again, i.e. after the next render.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) browse.current?.focus()
  }, [refocus])

  // Leaving the page cancels an upload in flight.
  useEffect(() => () => abort.current?.abort(), [])

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

  // A paste is a one-time upload from the item snapshot that opened this dialog.
  const initialPaste = useRef({ file: initialFile, upload })
  useEffect(() => {
    const { file, upload: uploadPasted } = initialPaste.current
    if (!file || pastedUploadStarted.current) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || pastedUploadStarted.current) return
      pastedUploadStarted.current = true
      uploadPasted(file)
    })
    // Defer until effects settle so Strict Mode's rehearsal cleanup cancels the first attempt.
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <div className="flex flex-col gap-4">
      <CurrentImage item={item} busy={busy} onRemove={() => void remove()} />

      <div
        {...dragProps}
        data-dragging={dragging || undefined}
        className={cx(
          'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors',
          dragging ? 'border-accent bg-accent/10' : 'border-border-strong bg-surface',
        )}
      >
        {uploading ? (
          <UploadProgress
            name={uploading.name}
            fraction={uploading.fraction}
            onCancel={() => abort.current?.abort()}
          />
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
