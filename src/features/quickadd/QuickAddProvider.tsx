import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMatch } from 'react-router'
import { QuickAddContext } from './QuickAddContext'
import { QuickAddDialog } from './QuickAddDialog'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const dialogIsOpen = () => document.querySelector('[role="dialog"], [role="alertdialog"]') !== null

/**
 * Mounted once in `AppShell`: owns the Quick add dialog, the `N` shortcut (not while typing, with
 * a modifier, or while another dialog is open) and the `open()` the sidebar button and ListView use.
 */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [openFor, setOpenFor] = useState<{ listId?: string } | null>(null)
  const listMatch = useMatch('/lists/:listId/*')
  const currentListId = listMatch?.params.listId

  const open = useCallback(
    (listId?: string) => setOpenFor((now) => now ?? { listId: listId ?? currentListId }),
    [currentListId],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n') return
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      if (event.defaultPrevented || event.repeat || isTyping(event.target) || dialogIsOpen()) return
      event.preventDefault()
      open()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const value = useMemo(() => ({ open }), [open])
  return (
    <QuickAddContext.Provider value={value}>
      {children}
      {openFor && (
        <QuickAddDialog initialListId={openFor.listId} onClose={() => setOpenFor(null)} />
      )}
    </QuickAddContext.Provider>
  )
}
