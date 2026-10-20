import { useMemo } from 'react'
import { Select } from '../../components/ui'
import { useTree } from '../tree'
import { sortListChoices } from './model'

/** The lists of the tree, most recently updated first. */
export function useListChoices() {
  const tree = useTree()
  const lists = useMemo(() => sortListChoices(tree.data?.lists ?? []), [tree.data])
  return { lists, loading: tree.isPending }
}

/** The "In [list]" picker at the top of the Quick add form. */
interface ListPickerProps {
  lists: { id: string; name: string }[]
  loading: boolean
  listId: string | undefined
  error: string | undefined
  /** Picks a list; the dialog also clears the lookup selection. */
  onPick: (listId: string) => void
}

export function ListPicker({ lists, loading, listId, error, onPick }: ListPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="text-sm text-text-muted">
        In
      </span>
      <div className="w-52 min-w-0 [&>div>label]:sr-only [&_button]:h-8 [&_button]:rounded-md">
        <Select
          label="List"
          placeholder={loading ? 'Loading lists…' : 'Select a list'}
          options={lists.map((l) => ({ value: l.id, label: l.name }))}
          value={listId}
          onValueChange={onPick}
          error={error}
        />
      </div>
    </div>
  )
}
