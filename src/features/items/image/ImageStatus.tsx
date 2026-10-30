import { Button } from '../../../components/ui'
import { ItemThumb } from '../../lists'
import type { Item } from '../api'

export type Busy =
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

/** The image the item has now: thumbnail, where it came from and Remove. Nothing without an image. */
export function CurrentImage({
  item,
  busy,
  onRemove,
}: {
  item: Item
  busy: Busy | null
  onRemove: () => void
}) {
  const image = item.image
  if (!image) return null
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ItemThumb item={item} className="aspect-video w-40 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-col items-start gap-2">
        <p className="text-ui break-all text-text-muted">{describeCurrent(image)}</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={onRemove}
          pending={busy?.kind === 'remove'}
          disabled={busy !== null}
        >
          Remove image
        </Button>
      </div>
    </div>
  )
}

/** An upload in flight: progress bar, status line and Cancel until every byte is sent. */
export function UploadProgress({
  name,
  fraction,
  onCancel,
}: {
  name: string
  fraction: number
  onCancel: () => void
}) {
  const percent = Math.round(fraction * 100)
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <div
        role="progressbar"
        aria-label={`Uploading ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-sm bg-border"
      >
        <div className="h-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p aria-live="polite" className="text-ui break-all text-text-muted">
        {fraction >= 1 ? `Processing ${name}…` : `Uploading ${name}… ${percent}%`}
      </p>
      {fraction < 1 && (
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel upload
        </Button>
      )}
    </div>
  )
}
