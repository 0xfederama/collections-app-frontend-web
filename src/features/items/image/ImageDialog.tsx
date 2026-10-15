import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Dialog } from '../../../components/ui'
import { itemKeys, type Item } from '../api'
import { ConflictBanner, GoneBanner } from '../inline/Banners'
import { ImageSection } from './ImageSection'

/**
 * Change or remove the item's image: the Image section (drop, browse, URL, Remove) in a dialog,
 * opened from the picture itself. Each change is its own request with `If-Match` from the item as
 * it is now; the first successful one closes the dialog. A 412 / 404 shows the usual banner.
 */
export function ImageDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const client = useQueryClient()
  const [stale, setStale] = useState<'conflict' | 'gone' | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)

  const reload = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: itemKeys.detail(item.id), exact: true },
        { throwOnError: true },
      )
      onClose()
    } catch {
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={item.image ? 'Change image' : 'Add image'}
      className="max-w-xl"
    >
      <ImageSection item={item} onChanged={onClose} onStale={setStale} />
      {stale === 'conflict' && (
        <ConflictBanner
          message="Someone else changed this item. The image has not been changed."
          onReload={() => void reload()}
          reloading={reloading}
          reloadFailed={reloadFailed}
        />
      )}
      {stale === 'gone' && (
        <GoneBanner message="This item was deleted or moved to Trash. The image has not been changed." />
      )}
    </Dialog>
  )
}
