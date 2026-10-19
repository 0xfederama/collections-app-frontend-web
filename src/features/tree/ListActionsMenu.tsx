import { useState } from 'react'
import { type MenuItem } from '../../components/ui'
import { typeToValue, valueToType } from '../items/types'
import { useTreeDialogs } from './useTreeDialogs'
import { NodeMenu } from './NodeMenu'
import type { List } from './api'
import { useChangeType } from './useChangeType'
import { ListIconDialog } from './ListIconDialog'

/**
 * The list's overflow menu for the list header (W-06): Type, rename, move, delete.
 * It owns its dialogs, so it works outside the sidebar. After a delete it navigates home when
 * that list was open. Type lives here (F008-W5); a change on a list with items asks first.
 */
export function ListActionsMenu({ list }: { list: List }) {
  const [iconOpen, setIconOpen] = useState(false)
  const { actions, dialogs } = useTreeDialogs()
  const type = useChangeType(list)
  const leading: MenuItem[] = [
    {
      type: 'radio-submenu',
      label: `Type: ${type.currentName}`,
      value: typeToValue(list.type),
      options: type.options,
      onValueChange: (value) => type.pick(valueToType(value)),
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
      {type.dialog}
      {iconOpen && <ListIconDialog list={list} onClose={() => setIconOpen(false)} />}
    </>
  )
}
