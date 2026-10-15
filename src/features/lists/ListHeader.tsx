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
import type { ItemKind } from '../items/api'
import { sortKeyLabel } from '../items/kinds'
import type { DisplayMode, List, PinnedFields, SortMode } from './api'
import { KindChip } from './KindChip'
import { ListDescription } from './ListDescription'
import { PinnedMenu } from './PinnedMenu'

const modeOptions: SegmentedOption[] = [
  { value: 'compact', label: 'Compact rows', icon: <ListIcon />, iconOnly: true },
  { value: 'thumbnail', label: 'Thumbnail rows', icon: <Rows3 />, iconOnly: true },
  { value: 'grid', label: 'Grid', icon: <LayoutGrid />, iconOnly: true },
]

const baseSortOptions: SelectOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'title', label: 'Title' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'price', label: 'Price' },
]

/** Manual, Title, Recently updated, Price, and the kind's sort key when the kind has one (not generic). */
export function sortOptionsFor(kind: ItemKind): SelectOption[] {
  const label = sortKeyLabel(kind)
  return label ? [...baseSortOptions, { value: 'kind_key', label }] : baseSortOptions
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
  onPinned: (pinned: PinnedFields) => void
  onResetPinned: () => void
  onAddItem: () => void
}

/** Name, description, count, Add item, then the floating display mode / sort / filter toolbar (UI_SPEC §3). */
export function ListHeader(props: ListHeaderProps) {
  const { list } = props
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 text-3xl leading-tight font-bold tracking-tight break-words">
              {props.treeList.name}
            </h1>
            <KindChip list={props.treeList} />
          </div>
          <Button onClick={props.onAddItem}>
            <Plus aria-hidden className="size-4" />
            Add item
          </Button>
          <ListActionsMenu list={props.treeList} />
        </div>
        {list ? (
          <ListDescription treeList={props.treeList} text={list.description ?? null} />
        ) : (
          <Skeleton className="h-4 w-1/2" />
        )}
        <p className="text-sm text-text-muted">{props.countLabel}</p>
      </header>
      {/* Sticky inside the scrolling `main`: it blurs the items that pass behind it. */}
      <div className="z-10 -mx-2 sm:sticky sm:top-0 flex flex-wrap items-center gap-2 rounded-[22px] border border-border material px-2 py-1.5 shadow-float sm:rounded-full">
        <SegmentedControl
          aria-label="Display mode"
          options={modeOptions}
          value={props.displayMode}
          onValueChange={(value) => props.onDisplayMode(value as DisplayMode)}
        />
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="text-sm text-text-muted">
            Sort
          </span>
          <div className="w-44 [&>div>label]:sr-only [&_button]:h-9">
            <Select
              label="Sort"
              options={sortOptionsFor(props.treeList.kind)}
              value={props.sort}
              onValueChange={(value) => props.onSort(value as SortMode)}
            />
          </div>
        </div>
        {list && <PinnedMenu list={list} onChange={props.onPinned} onReset={props.onResetPinned} />}
        {props.canMakeDefault && (
          <Button
            variant="secondary"
            onClick={props.onMakeDefault}
            disabled={props.makeDefaultPending}
          >
            Make this the default sort
          </Button>
        )}
        <div className="min-w-40 flex-1 sm:ml-auto sm:max-w-xs [&_label]:sr-only">
          <TextField
            label="Filter items by title"
            type="search"
            placeholder="Filter by title"
            value={props.filter}
            onChange={(event) => props.onFilter(event.target.value)}
            prefix={<Search aria-hidden className="size-4" />}
            className="h-9 rounded-full"
          />
        </div>
      </div>
    </>
  )
}
