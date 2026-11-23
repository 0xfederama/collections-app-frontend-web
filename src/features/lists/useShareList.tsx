import { useState } from 'react'
import type { MenuItem } from '../../components/ui'
import { Share } from '../../components/ui/icons'
import { ShareDialog } from './ShareDialog'
import { shareViaSystem } from './shareFlow'
import { buildShareText, type ShareItem } from './shareText'

/**
 * The "Share" entry of the list "…" menu and its fallback dialog (roadmap 40). Shares exactly the
 * items the list shows, once every page is loaded; no request. The share sheet is called straight
 * from `onSelect` (the menu closes with it) to keep the user activation.
 */
export function useShareList(listName: string, items: readonly ShareItem[], complete: boolean) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const empty = !complete || items.length === 0
  const item: MenuItem = {
    label: 'Share',
    icon: <Share />,
    disabled: empty,
    hint: empty ? 'Nothing to share' : undefined,
    onSelect: () => {
      const built = buildShareText(items)
      void shareViaSystem(built, navigator).then((outcome) => {
        if (outcome !== 'fallback') return
        setText(built)
        setOpen(true)
      })
    },
  }
  const dialog = <ShareDialog open={open} onOpenChange={setOpen} listName={listName} text={text} />
  return { item, dialog }
}
