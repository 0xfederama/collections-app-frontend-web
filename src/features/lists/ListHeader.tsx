import { useState } from 'react'
import {
  Button,
  IconButton,
  Select,
  SegmentedControl,
  Skeleton,
  TextField,
  type SelectOption,
  type SegmentedOption,
} from '../../components/ui'
import {
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Rows3,
  Search,
} from '../../components/ui/icons'
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

/** Name, kind and count, Add item, description, then the floating display mode / sort / filter toolbar (UI_SPEC §3). */
export function ListHeader(props: ListHeaderProps) {
  const { list } = props
  // Below 44rem of toolbar width the filter is an icon that opens the field (CSS container query);
  // a filter that is already set stays visible.
  const [filterOpen, setFilterOpen] = useState(props.filter !== '')
  const filterShown = filterOpen || props.filter !== ''
  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 text-3xl leading-tight font-bold tracking-tight break-words">
              {props.treeList.name}
            </h1>
            <KindChip list={props.treeList} />
            <span className="text-sm text-text-muted">{props.countLabel}</span>
          </div>
          <Button
            variant="secondary"
            onClick={props.onAddItem}
            className="max-sm:w-10 max-sm:px-0 pointer-coarse:max-sm:w-11"
          >
            <Plus aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Add item</span>
          </Button>
          <ListActionsMenu list={props.treeList} />
        </div>
        {list ? (
          <ListDescription treeList={props.treeList} text={list.description ?? null} />
        ) : (
          <Skeleton className="h-4 w-1/2" />
        )}
      </header>
      {/* Sticky inside the scrolling `main`: it blurs the items that pass behind it. The wrapper is the
          container the narrow variants measure. */}
      <div className="@container z-10 sm:sticky sm:top-0">
        <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border material px-2 py-1.5 shadow-float sm:rounded-full">
          <SegmentedControl
            aria-label="Display mode"
            options={modeOptions}
            value={props.displayMode}
            onValueChange={(value) => props.onDisplayMode(value as DisplayMode)}
          />
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="text-sm text-text-muted @max-[44rem]:hidden">
              Sort
            </span>
            <div className="relative w-44 @max-[44rem]:w-9 pointer-coarse:@max-[44rem]:w-11 [&>div>label]:sr-only [&_button]:h-9 @max-[44rem]:[&_button]:justify-center @max-[44rem]:[&_button]:rounded-full @max-[44rem]:[&_button]:px-0 @max-[44rem]:[&_button>span:first-child]:sr-only @max-[44rem]:[&_button>span:last-child]:hidden">
              <Select
                label="Sort"
                options={sortOptionsFor(props.treeList.kind)}
                value={props.sort}
                onValueChange={(value) => props.onSort(value as SortMode)}
              />
              <ArrowUpDown
                aria-hidden
                className="pointer-events-none absolute inset-0 m-auto size-4 text-text-muted @[44rem]:hidden"
              />
            </div>
          </div>
          {list && (
            <PinnedMenu list={list} onChange={props.onPinned} onReset={props.onResetPinned} />
          )}
          {props.canMakeDefault && (
            <Button
              variant="secondary"
              onClick={props.onMakeDefault}
              disabled={props.makeDefaultPending}
            >
              Make this the default sort
            </Button>
          )}
          <IconButton
            aria-label="Filter by title"
            aria-expanded={filterShown}
            aria-controls="list-filter"
            variant="secondary"
            onClick={() => setFilterOpen((open) => !open)}
            className="size-9 pointer-coarse:size-11 @[44rem]:hidden"
          >
            <Search aria-hidden />
          </IconButton>
          <div
            id="list-filter"
            className={
              filterShown
                ? 'min-w-40 flex-1 @max-[44rem]:order-last @max-[44rem]:basis-full @[44rem]:ml-auto @[44rem]:max-w-xs [&_label]:sr-only'
                : 'hidden min-w-40 flex-1 @[44rem]:ml-auto @[44rem]:block @[44rem]:max-w-xs [&_label]:sr-only'
            }
          >
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
      </div>
    </>
  )
}
