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
import { ListDescription } from './ListDescription'
import { PinnedMenu } from './PinnedMenu'
import { toolbarControl } from './toolbarStyles'

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
  // Generic has no price and no kind key (F008-W14).
  if (kind === 'generic') return baseSortOptions.filter((option) => option.value !== 'price')
  return label ? [...baseSortOptions, { value: 'kind_key', label }] : baseSortOptions
}

export interface ListHeaderProps {
  /** The list as the sidebar tree has it: its name shows before the list loads, and feeds the actions menu. */
  treeList: TreeList
  list: List | undefined
  /** The top-right "New item": hidden on an empty list, where the centered call to action is the only one. */
  showAddItem: boolean
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

/** Name, New item (once the list has items), description, then the floating display mode / sort / filter toolbar (UI_SPEC §3). */
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
          <h1 className="min-w-0 flex-1 text-3xl leading-tight font-bold tracking-tight break-words">
            {props.treeList.name}
          </h1>
          {props.showAddItem && (
            <Button
              variant="secondary"
              onClick={props.onAddItem}
              className="max-sm:w-10 max-sm:px-0 pointer-coarse:max-sm:w-11"
            >
              <Plus aria-hidden className="size-4" />
              <span className="max-sm:sr-only">New item</span>
            </Button>
          )}
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border material p-1.5 shadow-float">
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
            <div className="relative w-44 @max-[44rem]:w-9 pointer-coarse:@max-[44rem]:w-11 [&>div>label]:sr-only [&_button]:h-9! [&_button]:border-transparent! [&_button]:hover:border-transparent! [&_button]:hover:bg-fill-hover @max-[44rem]:[&_button]:justify-center @max-[44rem]:[&_button]:px-0 @max-[44rem]:[&_button>span:first-child]:sr-only @max-[44rem]:[&_button>span:last-child]:hidden">
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
          {props.canMakeDefault && (
            <button
              type="button"
              onClick={props.onMakeDefault}
              disabled={props.makeDefaultPending}
              className={toolbarControl}
            >
              Make this the default sort
            </button>
          )}
          {/* Pinned fields and the filter sit together at the right end (the filter field follows). */}
          <div className="ml-auto flex items-center gap-2">
            {list && props.treeList.kind !== 'generic' && (
              <PinnedMenu list={list} onChange={props.onPinned} onReset={props.onResetPinned} />
            )}
            <IconButton
              aria-label="Filter by title"
              aria-expanded={filterShown}
              aria-controls="list-filter"
              variant="ghost"
              onClick={() => setFilterOpen((open) => !open)}
              className="size-9 bg-fill hover:bg-fill-hover pointer-coarse:size-11 @[44rem]:hidden"
            >
              <Search aria-hidden />
            </IconButton>
          </div>
          <div
            id="list-filter"
            className={
              filterShown
                ? 'min-w-40 flex-1 @max-[44rem]:order-last @max-[44rem]:basis-full @[44rem]:max-w-xs [&_label]:sr-only'
                : 'hidden min-w-40 flex-1 @[44rem]:block @[44rem]:max-w-xs [&_label]:sr-only'
            }
          >
            <TextField
              label="Filter items by title"
              type="search"
              placeholder="Filter by title"
              value={props.filter}
              onChange={(event) => props.onFilter(event.target.value)}
              prefix={<Search aria-hidden className="size-4" />}
              className="h-9! border-transparent! hover:border-transparent! focus-within:border-accent!"
            />
          </div>
        </div>
      </div>
    </>
  )
}
