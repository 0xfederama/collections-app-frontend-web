import { useId, useState } from 'react'
import { Button, Skeleton, type SelectOption } from '../../components/ui'
import { Pencil, Plus, Search } from '../../components/ui/icons'
import { BackToHomeButton } from '../../components/BackToHomeButton'
import { useBreakpoint } from '../../lib/breakpoints'
import { type List as TreeList, ListActionsMenu, ListIconDialog } from '../tree'
import { hasPrice, typeName, type TypeDefinition } from '../items'
import type { DisplayMode, List, SortMode } from './api'
import { ListDescription } from './ListDescription'
import { ListIconMark } from './ListIconMark'
import { ListTitle } from './ListTitle'
import { SortMenu } from './SortMenu'
import { ViewMenu } from './ViewMenu'
import { toolbarSearchControl } from './toolbarStyles'
import { DefaultSortChip } from './DefaultSortChip'
import {
  AvailabilityChip,
  FieldFilterChip,
  FieldFilterMenu,
  describeFieldFilter,
  type FieldFilterValue,
} from './FieldFilter'
import { supportsAvailability, type Availability } from './availability'

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

/** The menu label of a sort, as the "make default" line names it. */
function sortLabel(definition: TypeDefinition, sort: SortMode): string {
  return sortOptionsFor(definition).find((option) => option.value === sort)?.label ?? sort
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
  /** The applied availability choice; changing it is offered on movie and TV lists only (F-026 W4). */
  availability: Availability | null
  onAvailability: (value: Availability | null) => void
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

/** Title, type chip, description, then the sticky toolbar: display mode, search, filter, sort, then the + New item button (UI_SPEC §3). */
export function ListHeader(props: ListHeaderProps) {
  const { list } = props
  // Phones: short placeholder (F-025 W8); the field is always visible at every width.
  const phone = useBreakpoint() === 'mobile'
  const searchId = useId()
  // F026 W1: the field is drawn like the icon buttons beside it (no white field, no outline), not as a TextField.
  const searchLabel =
    props.treeList.type === 'movie' ? 'Search items by title or director' : 'Search items by title'
  const searchField = (
    <div className="min-w-0 flex-1 md:min-w-40">
      <label htmlFor={searchId} className="sr-only">
        {searchLabel}
      </label>
      <div className={toolbarSearchControl}>
        <Search aria-hidden className="size-4 shrink-0 text-text-muted" />
        <input
          id={searchId}
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
          className="min-w-0 flex-1 appearance-none bg-transparent outline-none placeholder:text-text-muted"
        />
      </div>
    </div>
  )
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <BackToHomeButton />
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
      {/* Sticky inside the scrolling `main`; the solid background keeps passing items readable. The wrapper is the container the narrow variants measure. An applied field filter is a chip under the bar. */}
      <div className="@container z-10 -mt-2 bg-bg sm:sticky sm:top-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border py-3">
          <ViewMenu value={props.displayMode} onValueChange={props.onDisplayMode} />
          {searchField}
          <FieldFilterMenu
            fields={props.definition.fields}
            value={props.fieldFilter}
            onChange={props.onFieldFilter}
            availability={
              supportsAvailability(props.definition)
                ? { value: props.availability, onChange: props.onAvailability }
                : undefined
            }
          />
          {/* Like "+ Filter": an icon button, the active sort is checked inside its menu (F-025 W8). */}
          <SortMenu
            options={sortOptionsFor(props.definition)}
            value={props.sort}
            onValueChange={(value) => props.onSort(value as SortMode)}
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
        {(describeFieldFilter(props.definition.fields, props.fieldFilter) ||
          props.availability ||
          props.canMakeDefault) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {props.canMakeDefault && (
              <DefaultSortChip
                label={sortLabel(props.definition, props.sort)}
                onClick={props.onMakeDefault}
                pending={props.makeDefaultPending}
              />
            )}
            <FieldFilterChip
              fields={props.definition.fields}
              value={props.fieldFilter}
              onChange={props.onFieldFilter}
            />
            <AvailabilityChip value={props.availability} onChange={props.onAvailability} />
          </div>
        )}
      </div>
    </>
  )
}
