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
import {
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Plus,
  Rows3,
  Search,
} from '../../components/ui/icons'
import type { List as TreeList } from '../tree/api'
import { ListActionsMenu } from '../tree/ListActionsMenu'
import { ListIconDialog } from '../tree/ListIconDialog'
import { hasPrice, type TypeDefinition } from '../items/types'
import type { DisplayMode, List, PinnedFields, SortMode } from './api'
import { ListDescription } from './ListDescription'
import { ListIconMark } from './ListIconMark'
import { PinnedMenu } from './PinnedMenu'
import { toolbarControl } from './toolbarStyles'
import {
  FieldFilterChip,
  FieldFilterMenu,
  describeFieldFilter,
  type FieldFilterValue,
} from './FieldFilter'

const modeOptions: SegmentedOption[] = [
  { value: 'compact', label: 'Compact rows', icon: <ListIcon />, iconOnly: true },
  { value: 'thumbnail', label: 'Thumbnail rows', icon: <Rows3 />, iconOnly: true },
  { value: 'grid', label: 'Grid', icon: <LayoutGrid />, iconOnly: true },
]

const baseSortOptions: SelectOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'title', label: 'Title' },
  { value: 'updated', label: 'Recently updated' },
]

/** Sort choices supported for this type by the API. */
export function sortOptionsFor(definition: TypeDefinition): SelectOption[] {
  return [
    ...baseSortOptions,
    ...(hasPrice(definition) ? [{ value: 'price', label: 'Price' }] : []),
    // A stores field holds a list of store keys, which has no order to sort by (F016-W4).
    ...definition.fields
      .filter((field) => field.type !== 'stores')
      .map((field) => ({ value: field.key, label: field.label })),
  ]
}

export interface ListHeaderProps {
  /** The list as the sidebar tree has it: its name shows before the list loads, and feeds the actions menu. */
  treeList: TreeList
  definition: TypeDefinition
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
  fieldFilter: FieldFilterValue | null
  onFieldFilter: (value: FieldFilterValue | null) => void
  onPinned: (pinned: PinnedFields) => void
  onResetPinned: () => void
  onAddItem: () => void
}

/**
 * The list icon as a button (F018-W1): it opens the icon dialog from the header. The pen shows on
 * hover and keyboard focus, and always on touch, where there is no hover. The dialog takes the list
 * as it is when it opens, so its If-Match is the version the user saw.
 */
function ListIconButton({ list, defaultIcon }: { list: TreeList; defaultIcon?: string | null }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label="Change icon"
        onClick={() => setOpen(true)}
        className="group/icon relative grid size-9 shrink-0 place-items-center rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
      >
        <ListIconMark
          icon={list.icon ?? defaultIcon}
          iconColor={list.icon_color}
          type={list.type}
          className="size-9"
          iconClassName="size-5"
        />
        <span
          aria-hidden
          className="absolute -right-1.5 -bottom-1.5 grid size-5 place-items-center rounded-full border border-border bg-surface text-text-muted opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Pencil className="size-3" />
        </span>
      </button>
      {open && <ListIconDialog list={list} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Name, New item (once the list has items), description, then the floating display mode / sort / filter toolbar (UI_SPEC §3). */
export function ListHeader(props: ListHeaderProps) {
  const { list } = props
  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <ListIconButton list={props.treeList} defaultIcon={props.definition.default_icon} />
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
          {list && (props.definition.fields.length > 0 || props.definition.allows_price) && (
            <PinnedMenu
              list={list}
              definition={props.definition}
              onChange={props.onPinned}
              onReset={props.onResetPinned}
            />
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
          container the narrow variants measure. Option 4 (F019): search and "+ Filter" first, then
          sort and display; an applied field filter is a chip under the bar. */}
      <div className="@container z-10 sm:sticky sm:top-0">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border material p-1.5 shadow-float">
          <div className="min-w-40 flex-1 [&_label]:sr-only">
            <TextField
              label={
                props.treeList.type === 'movie'
                  ? 'Search items by title or director'
                  : 'Search items by title'
              }
              type="search"
              placeholder={
                props.treeList.type === 'movie' ? 'Search by title or director' : 'Search by title'
              }
              value={props.filter}
              onChange={(event) => props.onFilter(event.target.value)}
              prefix={<Search aria-hidden className="size-4" />}
              className="h-9! border-transparent! hover:border-transparent! focus-within:border-accent!"
            />
          </div>
          <FieldFilterMenu
            fields={props.definition.fields}
            value={props.fieldFilter}
            onChange={props.onFieldFilter}
          />
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="text-sm text-text-muted @max-[44rem]:hidden">
              Sort
            </span>
            <div className="relative w-44 @max-[44rem]:w-9 pointer-coarse:@max-[44rem]:w-11 [&>div>label]:sr-only [&_button]:h-9! [&_button]:border-transparent! [&_button]:hover:border-transparent! [&_button]:hover:bg-fill-hover @max-[44rem]:[&_button]:justify-center @max-[44rem]:[&_button]:px-0 @max-[44rem]:[&_button>span:first-child]:sr-only @max-[44rem]:[&_button>span:last-child]:hidden">
              <Select
                label="Sort"
                options={sortOptionsFor(props.definition)}
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
          <SegmentedControl
            aria-label="Display mode"
            options={modeOptions}
            value={props.displayMode}
            onValueChange={(value) => props.onDisplayMode(value as DisplayMode)}
          />
        </div>
        {describeFieldFilter(props.definition.fields, props.fieldFilter) && (
          <div className="mt-2 flex flex-wrap gap-2">
            <FieldFilterChip
              fields={props.definition.fields}
              value={props.fieldFilter}
              onChange={props.onFieldFilter}
            />
          </div>
        )}
      </div>
    </>
  )
}
