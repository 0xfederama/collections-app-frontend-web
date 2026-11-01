# lists

## Purpose

The list screen at `/lists/:listId`, its header and item rows, including pinned fields, sort, field filters and list icon selection and display.

## Key files

- `src/features/lists/ListView.tsx`: list screen and URL state (`?q=`, `?sort=`, `filter_*`).
- `ListTitle.tsx`: the list title, renamed in place by clicking it.
- `FieldFilter.tsx`: per-field filter control, `parseFieldFilter` for URL params, `FieldFilterMenu` (the "+ Filter" popover) and `FieldFilterChip` (the applied filter, removable, under the bar).
- `ListIconPicker.tsx`, `iconModel.ts`, `emojiKeywords.ts`: searchable icon/emoji choices and parsing.
- `ListIconMark.tsx`: shared list mark renderer.
- `index.ts`: public face; `screens.ts` holds `ListView` for the route only.
- `ListHeader.tsx`, `ItemsView.tsx`, `ItemEntry.tsx`, `ItemRows.tsx` (`DraftRow`, `SortableEntry`), `ItemControls.tsx`, `ItemPinned.tsx`, `ItemsSkeleton.tsx`: header, rows and their parts.
- `listParams.ts`: URL parsing (`parseSort`, `buildItemsParams`); `useDebouncedFilter.ts`: debounced `?q=`.
- `ListDescription.tsx`, `ListDescriptionView.tsx`, `ListDescriptionEditor.tsx`: the list's Markdown description.
- `pinned.ts`, `toolbarStyles.ts`: fixed pinned fields per built-in type and toolbar. The bar is: search ("Search by title"), "+ Filter", sort, display mode.
- `api.ts`: list and item queries/mutations; `listKeys` is in `src/data/keys.ts`.

## Interfaces

- `ListIconPicker({ value, onChange, onClose, type? })`: built-in icons, emoji, mark color and default.
- `ListIconMark({ icon, iconColor, type, className, iconClassName })`: list mark.
- `ListView({ treeList })`, `ListHeader`, `ItemsView`, `ItemEntry`: list components.
- `FieldFilter({ fields, value, onChange })`, `parseFieldFilter(params, fields)`.
- `useList`, `useListItems`, `useUpdateList`, `useReorderItems` (`api.ts`); `listKeys` from `src/data/keys.ts`.
- `fixedPinned(definition)`, `pinnedPlacements`, `formatPinnedValue`, `formatPrice`; `sortOptionsFor` (in `ListHeader.tsx`): display helpers.

## Gotchas

- Pinned fields are fixed per built-in type (`FIXED_PINS` in `pinned.ts`, F-022); there is no per-list choice and no Pinned menu. A pin whose field the type lacks is dropped (`price` counts only where allowed); "No type" pins nothing. One pin sits beside the title; two put the second in the right corner; three put the first two beside the title and the third in the corner (`pinnedPlacements`).
- Streaming in a row shows only the services in Settings `owned_streaming_services` (`filterOwnedPlatforms`); empty = all.
- Sort and filter accept only the built-in field keys of the list's type (plus `price` where the type allows it); a custom key in the URL is ignored (F-023).
- Filter URL params: `filter_field` plus `filter_value` (text, link, boolean), or `filter_min` / `filter_max` (number, date). Invalid or stale params are dropped; streaming and stores fields are not filterable, and stores fields are not sortable.
- A sort the type does not define falls back to the list's `sort_mode`, so stale `?sort=` values are ignored.
- Icon choices are stored as `i:<name>` for built-in marks or as one emoji; keyword aliases are vendored locally.
- The header icon is a button that opens `ListIconDialog` (pen on hover, focus or touch). List icon writes are owned by the tree feature and use the list version with `If-Match`.
- A list with no type shows the Lucide `List` glyph (`typeIconFor(null)`).
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for the full interaction spec.
