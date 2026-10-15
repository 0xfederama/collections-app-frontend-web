import { useState } from 'react'
import { Dialog } from '../../components/ui'
import { ImagePlus } from '../../components/ui/icons'
import { ItemThumb } from '../lists/ItemThumb'
import type { Item } from './api'
import { ImageDialog } from './image/ImageDialog'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

/**
 * The picture at the top of the item (UI_SPEC §4): the original image (max 16:9, limited to the
 * viewport height) that opens in a lightbox, with a "Change image" button over it (shown on hover
 * and keyboard focus, always on touch). An item without an image has only a slim "Add image" row,
 * and an image that fails to load shows the fallback tile.
 */
export function ItemHero({ item }: { item: Item }) {
  const src = item.image?.url
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [changing, setChanging] = useState(false)
  const frame = 'aspect-video max-h-[45dvh] w-full rounded-xl'

  const dialog = changing && <ImageDialog item={item} onClose={() => setChanging(false)} />

  if (!item.image) {
    return (
      <>
        <button
          type="button"
          onClick={() => setChanging(true)}
          className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-sm text-text-muted transition-colors hover:border-accent hover:text-text pointer-coarse:h-12 ${focusRing}`}
        >
          <ImagePlus aria-hidden className="size-4" />
          Add image
        </button>
        {dialog}
      </>
    )
  }

  return (
    <div className="group/hero relative">
      {!src || src === failedSrc ? (
        <ItemThumb item={{ ...item, image: null }} className={frame} />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label={`View image of ${item.title} full size`}
            className={`block w-full cursor-zoom-in rounded-xl ${focusRing}`}
          >
            <img
              src={src}
              alt={item.title}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailedSrc(src)}
              className={`${frame} bg-border object-cover object-center`}
            />
          </button>
          <Dialog
            open={lightbox}
            onOpenChange={setLightbox}
            title={item.title}
            className="max-w-4xl"
          >
            <img
              src={src}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="max-h-[70dvh] w-full rounded-md object-contain"
            />
          </Dialog>
        </>
      )}
      <button
        type="button"
        onClick={() => setChanging(true)}
        className={`bg-surface-raised absolute top-3 right-3 inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-text opacity-0 shadow-float transition-opacity duration-150 group-focus-within/hero:opacity-100 group-hover/hero:opacity-100 focus-visible:opacity-100 pointer-coarse:h-11 [@media(hover:none)]:opacity-100 ${focusRing}`}
      >
        <ImagePlus aria-hidden className="size-4" />
        Change image
      </button>
      {dialog}
    </div>
  )
}
