import { useState } from 'react'
import {
  Button,
  Select,
  SegmentedControl,
  Skeleton,
  TextField,
  type SelectOption,
  type SegmentedOption,
} from '../../components/ui'
import { LayoutGrid, List as ListIcon, Plus, Rows3, Search } from '../../components/ui/icons'
import type { List as TreeList } from '../tree/api'
import { ListActionsMenu } from '../tree/ListActionsMenu'
import type { DisplayMode, List, SortMode } from './api'

const modeOptions: SegmentedOption[] = [
  { value: 'compact', label: 'Compact rows', icon: <ListIcon />, iconOnly: true },
  { value: 'thumbnail', label: 'Thumbnail rows', icon: <Rows3 />, iconOnly: true },
  { value: 'grid', label: 'Grid', icon: <LayoutGrid />, iconOnly: true },
]

const sortOptions: SelectOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'title', label: 'Title' },
  { value: 'updated', label: 'Recently updated' },
]

const LONG_DESCRIPTION = 140

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > LONG_DESCRIPTION || text.includes('\n')
  return (
    <div className="max-w-prose text-sm text-text-muted">
      <p className={expanded || !long ? 'whitespace-pre-line' : 'line-clamp-2'}>{text}</p>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 rounded-sm text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

export interface ListHeaderProps {
  /** The list as the sidebar tree has it: its name shows before the list loads, and feeds the actions menu. */
  treeList: TreeList
  list: List | undefined
  /** e.g. `12 items` or `3 of 12 items`. */
  countLabel: string
  displayMode: DisplayMode
  onDisplayMode: (mode: DisplayMode) => void
  sort: SortMode
  onSort: (sort: SortMode) => void
  /** The sort differs from the list's saved one, so it can be saved as the default (D-063). */
  canMakeDefault: boolean
  onMakeDefault: () => void
  makeDefaultPending: boolean
  filter: string
  onFilter: (value: string) => void
  onAddItem: () => void
}

/** Name, description, count, Add item, and the display mode / sort / filter toolbar (UI_SPEC §3). */
export function ListHeader(props: ListHeaderProps) {
  const { list } = props
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 font-display text-2xl font-semibold break-words">
          {props.treeList.name}
        </h1>
        <Button onClick={props.onAddItem}>
          <Plus aria-hidden className="size-4" />
          Add item
        </Button>
        <ListActionsMenu list={props.treeList} />
      </div>
      {list ? (
        list.description && <Description text={list.description} />
      ) : (
        <Skeleton className="h-4 w-1/2" />
      )}
      <p className="text-sm text-text-muted">{props.countLabel}</p>
      <div className="flex flex-wrap items-end gap-3">
        <SegmentedControl
          aria-label="Display mode"
          options={modeOptions}
          value={props.displayMode}
          onValueChange={(value) => props.onDisplayMode(value as DisplayMode)}
        />
        <div className="w-44">
          <Select
            label="Sort"
            options={sortOptions}
            value={props.sort}
            onValueChange={(value) => props.onSort(value as SortMode)}
          />
        </div>
        {props.canMakeDefault && (
          <Button
            variant="secondary"
            onClick={props.onMakeDefault}
            disabled={props.makeDefaultPending}
          >
            Make this the default sort
          </Button>
        )}
        <div className="min-w-48 flex-1 sm:max-w-xs [&_label]:sr-only">
          <TextField
            label="Filter items by title"
            type="search"
            placeholder="Filter by title"
            value={props.filter}
            onChange={(event) => props.onFilter(event.target.value)}
            prefix={<Search aria-hidden className="size-4" />}
          />
        </div>
      </div>
    </header>
  )
}
