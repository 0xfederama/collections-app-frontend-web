import { useTreeDialogs } from './useTreeDialogs'
import { NodeMenu } from './NodeMenu'
import type { List } from './api'

/**
 * The list's overflow menu for the list header (W-06): rename, edit description, move, delete.
 * It owns its dialogs, so it works outside the sidebar. After a delete it navigates home when
 * that list was open.
 */
export function ListActionsMenu({ list }: { list: List }) {
  const { actions, dialogs } = useTreeDialogs()
  return (
    <>
      <NodeMenu
        node={{ kind: 'list', id: list.id, list }}
        actions={actions}
        name={list.name}
      />
      {dialogs}
    </>
  )
}
