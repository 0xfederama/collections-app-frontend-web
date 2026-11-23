import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useBreakpoint } from '../../lib/breakpoints'
import { NEW_ITEM_ID } from '../items'

/** Text entry, a widget that owns the arrow keys, or an open layer (dialog, menu, listbox, popup). */
const OWNS_ARROWS =
  'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"], [role="radio"], [role="slider"], [role="spinbutton"], [role="tab"], [role="menuitem"], [role="option"], .cm-editor, [role="tree"], nav'
const OPEN_LAYER =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [aria-haspopup][aria-expanded="true"], [role="combobox"][aria-expanded="true"]'
/** dnd-kit marks the row it is dragging; the item list's own keyboard drag uses the arrows. */
const DRAGGING = '[data-dnd-dragging]'

const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Roadmap 40: with an item open beside the list (≥ 1280 px), ArrowUp / ArrowDown open the previous /
 * next item of the rows the list shows now (its sort, search and filters), stopping at the ends. It
 * opens the item as a row click does (a push, the list's query string kept), scrolls that row into
 * view and announces it. Returns the live region to render.
 */
export function useItemArrowNav(
  items: readonly { id: string; title: string }[],
  listId: string,
  search: string,
): ReactNode {
  const navigate = useNavigate()
  const itemId = useParams().itemId
  const wide = useBreakpoint() === 'wide'
  const [announcement, setAnnouncement] = useState('')
  // The handler reads the latest values without re-binding on every render.
  const latest = useRef({ items, listId, search, itemId, wide, navigate })
  useEffect(() => {
    latest.current = { items, listId, search, itemId, wide, navigate }
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      if (event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      const current = latest.current
      if (!current.wide || !current.itemId || current.itemId === NEW_ITEM_ID) return
      const target = event.target as Element | null
      if (target?.closest?.(OWNS_ARROWS)) return
      if (document.querySelector(`${OPEN_LAYER}, ${DRAGGING}`)) return
      const index = current.items.findIndex((item) => item.id === current.itemId)
      if (index === -1) return
      const next = current.items[index + (event.key === 'ArrowDown' ? 1 : -1)]
      event.preventDefault()
      if (!next) return
      void current.navigate({
        pathname: `/lists/${current.listId}/items/${next.id}`,
        search: current.search,
      })
      setAnnouncement(
        `${next.title}, ${current.items.indexOf(next) + 1} of ${current.items.length}`,
      )
      document
        .querySelector<HTMLElement>(`li[data-item-id="${next.id}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
  )
}
