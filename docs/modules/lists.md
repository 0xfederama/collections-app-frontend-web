# lists

## Purpose

The list screen at `/lists/:listId`, its header and item rows, including pinned fields, sort, field filters and list icon selection and display.

## Key files

- `src/features/lists/ListView.tsx`: list screen and URL state (`?q=`, `?sort=`, `filter_*`).
- `FieldFilter.tsx`: per-field filter control and `parseFieldFilter` for URL params.
- `ListIconPicker.tsx`, `iconModel.ts`, `emojiKeywords.ts`: searchable icon/emoji choices and parsing.
- `ListIconMark.tsx`: shared list mark renderer.
- `ListHeader.tsx`, `ItemsView.tsx`, `ItemEntry.tsx`: header, sort options and item rows.
- `pinned.ts`, `PinnedMenu.tsx`, `toolbarStyles.ts`: pinned fields and toolbar.
- `api.ts`: list and item queries/mutations.

## Interfaces

- `ListIconPicker({ value, onChange, onClose, type? })`: built-in icons, emoji, mark color and default.
- `ListIconMark({ icon, iconColor, type, className, iconClassName })`: list mark.
- `ListView({ treeList })`, `ListHeader`, `ItemsView`, `ItemEntry`: list components.
- `FieldFilter({ fields, value, onChange })`, `parseFieldFilter(params, fields)`.
- `useListItems`, `useUpdateList`, `useReorderItems`, `listKeys`: list API hooks and query keys.
- `resolvePinned`, `defaultPinned`, `pinnableFields`, `pinnedPlacements`, `formatPrice`, `sortOptionsFor`: display helpers.

## Gotchas

- Pinned fields, sort and filter accept any field key of the list's type (plus `price` where the type allows it); at most two pins, `null` = type default.
- Filter URL params: `filter_field` plus `filter_value` (text, link, boolean), or `filter_min` / `filter_max` (number, date). Invalid or stale params are dropped; streaming fields are not filterable.
- A sort the type does not define falls back to the list's `sort_mode`, so stale `?sort=` values are ignored.
- Icon choices are stored as `i:<name>` for built-in marks or as one emoji; keyword aliases are vendored locally.
- List icon writes are owned by the tree feature and use the list version with `If-Match`.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for the full interaction spec.
