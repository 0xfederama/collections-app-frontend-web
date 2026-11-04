import { useState } from 'react'
import { PageHeaderSlot } from '../../components/PageHeaderSlot'
import {
  Button,
  SegmentedControl,
  Skeleton,
  TextField,
  type SelectOption,
  type SegmentedOption,
} from '../../components/ui'
import {
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Plus,
  Rows3,
  Search,
} from '../../components/ui/icons'
import { useBreakpoint } from '../../lib/breakpoints'
import { type List as TreeList, ListActionsMenu, ListIconDialog } from '../tree'
import { hasPrice, typeName, type TypeDefinition } from '../items'
import type { DisplayMode, List, SortMode } from './api'
import { ListDescription } from './ListDescription'
import { ListIconMark } from './ListIconMark'
import { ListTitle } from './ListTitle'
import { SortMenu } from './SortMenu'
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
  /** The "New item" button of the toolbar: hidden on an empty list, where the centered call to action is the only one. */
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
        className="group/icon relative grid size-11 shrink-0 place-items-center rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
      >
        <ListIconMark
          icon={list.icon ?? defaultIcon}
          iconColor={list.icon_color}
          type={list.type}
          className="size-11"
          iconClassName="size-6"
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

/** The list's type as a chip under the title (F021); the count follows the items. */
function TypeChip({ type, definition }: { type: TreeList['type']; definition: TypeDefinition }) {
  return (
    <span className="w-fit max-w-full rounded-md bg-accent px-2.5 py-1 text-secondary font-medium text-accent-fg">
      {typeName(definition, type)}
    </span>
  )
}

/** Title, type chip, description, then the sticky toolbar: search, filter, sort, display mode, then the + New item button (UI_SPEC §3). */
export function ListHeader(props: ListHeaderProps) {
  const { list } = props
  // Phones get the short placeholder (F-025 W8); the label keeps the full name for assistive tech.
  const phone = useBreakpoint() === 'mobile'
  return (
    <>
      <header className="flex flex-col gap-3">
        {/* On phones the row starts with the menu button (F-025 W10). */}
        <div className="flex flex-wrap items-center gap-3">
          <PageHeaderSlot />
          <ListIconButton list={props.treeList} defaultIcon={props.definition.default_icon} />
          <h1 className="min-w-0 flex-1 font-display text-display break-words">
            <ListTitle list={props.treeList} />
          </h1>
          <ListActionsMenu list={props.treeList} />
        </div>
        <TypeChip type={props.treeList.type} definition={props.definition} />
        {list ? (
          <ListDescription treeList={props.treeList} text={list.description ?? null} />
        ) : (
          <Skeleton className="h-4 w-1/2" />
        )}
      </header>
      {/* Sticky inside the scrolling `main`: the solid background keeps the items that pass behind it
          readable. The wrapper is the container the narrow variants measure. Search and "+ Filter" first, then sort, display and the + New item; an applied field filter is a chip under the bar. */}
      <div className="@container z-10 -mt-2 bg-bg sm:sticky sm:top-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border py-3">
          {/* Phones (< 768 px): the field takes the space the icon-only controls leave (F-025 W2). */}
          <div className="min-w-0 flex-1 md:min-w-40 [&_label]:sr-only">
            <TextField
              label={
                props.treeList.type === 'movie'
                  ? 'Search items by title or director'
                  : 'Search items by title'
              }
              type="search"
              placeholder={
                phone
                  ? 'Search'
                  : props.treeList.type === 'movie'
                    ? 'Search by title or director'
                    : 'Search by title'
              }
              value={props.filter}
              onChange={(event) => props.onFilter(event.target.value)}
              prefix={<Search aria-hidden className="size-4" />}
              className="h-9! hover:border-text-muted! focus-within:border-accent!"
            />
          </div>
          <FieldFilterMenu
            fields={props.definition.fields}
            value={props.fieldFilter}
            onChange={props.onFieldFilter}
          />
          {/* Like "+ Filter": an icon button, the active sort is checked inside its menu (F-025 W8). */}
          <SortMenu
            options={sortOptionsFor(props.definition)}
            value={props.sort}
            onValueChange={(value) => props.onSort(value as SortMode)}
          />
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
            className="shrink-0 [&_label]:size-8 [&_label]:justify-center [&_label]:px-0 pointer-coarse:[&_label]:size-11"
          />
          {props.showAddItem && (
            <Button
              size="sm"
              aria-label="New item"
              onClick={props.onAddItem}
              className="size-9! shrink-0 px-0! pointer-coarse:size-11!"
            >
              <Plus aria-hidden className="size-4" />
            </Button>
          )}
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
