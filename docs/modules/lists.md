# lists

## Purpose

The list screen at `/lists/:listId`, its header and item rows, including pinned fields, sort, field filters and list icon selection and display.

## Key files

- `src/features/lists/ListView.tsx`: list screen and URL state (`?q=`, `?sort=`, `filter_*`).
- `ListTitle.tsx`: the list title, renamed in place by clicking it.
- `FieldFilter.tsx`: per-field filter control, `parseFieldFilter` for URL params, `FieldFilterMenu` (the "+ Filter" popover, with the availability choices on movie and TV) and `FieldFilterChip` / `AvailabilityChip` (the applied filters, removable, under the bar).
- `availability.ts`: the two availability values, their labels and `parseAvailability` (`?availability=`, movie and TV only).
- `src/lib/keyboardProxy.ts`: iOS keyboard proxy used by "New item" (`focusKeyboardProxy`, `releaseKeyboardProxy`).
- `ListIconPicker.tsx`, `iconModel.ts`, `emojiKeywords.ts`: searchable icon/emoji choices and parsing.
- `ListIconMark.tsx`: shared list mark renderer.
- `index.ts`: public face; `screens.ts` holds `ListView` for the route only.
- `ListHeader.tsx`, `ItemsView.tsx`, `ItemEntry.tsx`, `ItemRows.tsx` (`DraftRow`, `SortableEntry`), `ItemControls.tsx` (row menu), `ItemPinned.tsx`, `ItemsSkeleton.tsx`: header, rows and their parts.
- `src/lib/useLongPress.ts`: touch and pen long press on a row (opens its menu).
- `listParams.ts`: URL parsing (`parseSort`, `buildItemsParams`); `useDebouncedFilter.ts`: debounced `?q=`.
- `ListDescription.tsx`, `ListDescriptionView.tsx`, `ListDescriptionEditor.tsx`: the list's Markdown description.
- `pinned.ts`: fixed pins per built-in type (`FIXED_PINS`), text pieces and truncation.
- `ViewMenu.tsx`: the "View options" icon button (display mode radio menu). `SortMenu.tsx`, `toolbarStyles.ts`: the icon-only "View options", "+ Filter" and "Sort" buttons (one 36 px square, 44 px on touch). The toolbar is one row at every width: View options, search field (always visible), Filter, Sort, New item (`ListHeader.tsx`).
- `TileStrip.tsx`, `tileFit.ts`: a row's service or store tiles that fit the row, then a "+N" tile; at most `MAX_TILES` (4) slots.
- `scrollRestore.ts`: `useScrollRestore`, the list's scroll per history entry (`main`, or the window on phones).
- `api.ts`: list and item queries/mutations; `listKeys` is in `src/data/keys.ts`.

## Interfaces

- `ListIconPicker({ value, onChange, onClose, type? })`: built-in icons, emoji, mark color and default.
- `ListIconMark({ icon, iconColor, type, className, iconClassName })`: list mark.
- `ListView({ treeList })`, `ListHeader`, `ItemsView`, `ItemEntry`: list components.
- `entryMenu(title, state, reorder?)` (`ItemControls.tsx`), `useLongPress({ onLongPress })`: row menu and long press.
- `FieldFilter({ fields, value, onChange })`, `parseFieldFilter(params, fields)`; `FieldFilterMenu` takes an optional `availability` prop.
- `supportsAvailability(definition)`, `parseAvailability(value, definition)`, `availabilityLabel(value)`, `compactPinned(pinned)`.
- `ViewMenu({ value, onValueChange })`: display mode menu (compact, thumbnail, grid).
- `useScrollRestore(anchor, ready)`: returns `remember`, called before navigating away.
- `useList`, `useListItems`, `useUpdateList`, `useReorderItems` (`api.ts`); `listKeys` from `src/data/keys.ts`.
- `fixedPinned(definition)`, `pinnedPlacements`, `pinnedPieces`, `isLowPriorityPin`, `formatPinnedValue`, `formatPrice`; `sortOptionsFor` (in `ListHeader.tsx`): display helpers.
- `SortMenu({ options, value, onValueChange })`: icon button that opens radio items; the active sort is checked.

## Gotchas

- Pinned fields are fixed per built-in type (`FIXED_PINS` in `pinned.ts`, F-022): movie runtime, director, streaming; TV seasons, streaming; book pages, author, stores; vehicle model year, power; wishlist price. There is no per-list choice. A pin whose field the type lacks is dropped (`price` counts only where allowed); "No type" pins nothing. One pin sits beside the title; two put the second in the right corner; three put the first two beside the title and the third in the corner (`pinnedPlacements`).
- Director and pages are low-priority (`isLowPriorityPin`): they truncate with an ellipsis first; the other pins keep their width.
- Compact rows show the pins beside the title at every width (they were hidden below `sm`) and drop director and author (`compactPinned`, F-026 W3); thumbnail and grid keep every pin.
- The toolbar search is a bare `input type="search"` drawn with `toolbarSearchControl` (F-026 W1); its label is visually hidden.
- Availability (F-026 W4): `?availability=available|included`, movie and TV only (the type has a `streaming` field), sent to `GET /lists/{id}/items` as `availability`. Unknown or unsupported values are dropped. Applied, it is a removable chip under the bar, counts as a filter (no manual reorder, "No items match") and the empty state's "Clear filter" resets it too.
- "New item" on a tap calls `focusKeyboardProxy()` (not while the draft is open) so iOS opens the keyboard for the draft title; see [items](items.md).
- Streaming in a row shows only the services in Settings `owned_streaming_services` (`filterOwnedPlatforms`); empty = all.
- Sort and filter accept only the built-in field keys of the list's type (plus `price` where the type allows it); a custom key in the URL is ignored (F-023).
- Filter URL params: `filter_field` plus `filter_value` (text, link, boolean), or `filter_min` / `filter_max` (number, date). Invalid or stale params are dropped; streaming and stores fields are not filterable, and stores fields are not sortable.
- A sort the type does not define falls back to the list's `sort_mode`, so stale `?sort=` values are ignored.
- Icon choices are stored as `i:<name>` for built-in marks or as one emoji; keyword aliases are vendored locally.
- The header icon is a button that opens `ListIconDialog` (pen on hover, focus or touch). List icon writes are owned by the tree feature and use the list version with `If-Match`.
- A list with no type shows the Lucide `List` glyph (`typeIconFor(null)`).
- Long press (touch or pen, 500 ms, finger within 8 px) on a row opens its menu (Move up/down when reorderable, Move, Delete) and cancels the drag the hold started. A mouse uses the "…" button.
- Every display mode draws its rows in the same bordered frame (`surface` in `ItemEntry.tsx`); there are no hairline dividers.
- Row tiles: `TileStrip` shows the tiles that fit, then "+N"; more than 4 tiles draw 3 and "+N" (`cappedCount`). In compact rows the strip takes the free space and ends at the row's right edge. Streaming tiles follow the Settings service order with paid platforms last (`orderPlatforms`).
- The list header's "…" menu hosts "Refresh details" (see [tree](tree.md)).
- The reorder hint explains only a filter or unloaded items; there is no "switch to Manual sort" hint.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for the full interaction spec.

- Default sort (2.29.1): a sort other than the list's `sort_mode` shows `DefaultSortChip` ("Make “<label>” the default sort for this list") on the chip line under the toolbar, never in the toolbar row; it PATCHes `sort_mode`, then the line goes and "Default sort saved" toasts.
