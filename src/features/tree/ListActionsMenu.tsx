import { useState } from 'react'
import { type ItemKind, type MenuItem } from '../../components/ui'
import { useTreeDialogs } from './useTreeDialogs'
import { NodeMenu } from './NodeMenu'
import type { List } from './api'
import { useChangeKind } from './useChangeKind'
import { ListIconDialog } from './ListIconDialog'

/**
 * The list's overflow menu for the list header (W-06): Kind, rename, move, delete.
 * It owns its dialogs, so it works outside the sidebar. After a delete it navigates home when
 * that list was open. Kind lives here (F008-W5); a change on a list with items asks first.
 */
export function ListActionsMenu({ list }: { list: List }) {
  const [iconOpen, setIconOpen] = useState(false)
  const { actions, dialogs } = useTreeDialogs()
  const kind = useChangeKind(list)
  const leading: MenuItem[] = [
    {
      type: 'radio-submenu',
      label: `Kind: ${kind.currentName}`,
      value: list.kind,
      options: kind.options,
      onValueChange: (value) => kind.pick(value as ItemKind),
    },
    { type: 'separator' },
    { label: 'List icon…', onSelect: () => setIconOpen(true) },
    { type: 'separator' },
  ]
  return (
    <>
      <NodeMenu
        node={{ kind: 'list', id: list.id, list }}
        actions={actions}
        name={list.name}
        leading={leading}
      />
      {dialogs}
      {kind.dialog}
      {iconOpen && <ListIconDialog list={list} onClose={() => setIconOpen(false)} />}
    </>
  )
}
