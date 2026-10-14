import { useState } from 'react'
import { Dialog } from '../../components/ui'
import type { Item } from './api'
import { ItemThumb } from '../lists/ItemThumb'

/**
 * The picture at the top of the item (UI_SPEC §4): the original image (max 16:9, limited to the
 * viewport height) that opens in a lightbox, or the fallback tile when there is none or it fails
 * to load.
 */
export function ItemHero({ item }: { item: Item }) {
  const src = item.image?.url
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const frame = 'aspect-video max-h-[45dvh] w-full rounded-xl'

  if (!src || src === failedSrc) {
    return <ItemThumb item={{ ...item, image: null }} className={frame} />
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View image of ${item.title} full size`}
        className="block cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
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
      <Dialog open={open} onOpenChange={setOpen} title={item.title} className="max-w-4xl">
        <img
          src={src}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="max-h-[70dvh] w-full rounded-md object-contain"
        />
      </Dialog>
    </>
  )
}
