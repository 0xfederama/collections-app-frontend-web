# lists

## Purpose

The list screen at `/lists/:listId`, its header and item rows, and list icon selection and display.

## Key files

- `src/features/lists/ListView.tsx`: list screen and URL state.
- `ListIconPicker.tsx`, `iconModel.ts`, `emojiKeywords.ts`: searchable icon/emoji choices and parsing.
- `ListIconMark.tsx`: shared list mark renderer.
- `ListHeader.tsx`, `ItemsView.tsx`, `ItemEntry.tsx`: header and item rows.
- `pinned.ts`, `PinnedMenu.tsx`, `toolbarStyles.ts`: pinned fields and toolbar.
- `api.ts`: list and item queries/mutations.

## Interfaces

- `ListIconPicker({ value, onChange, onClose, kind? })`: built-in icons, emoji, mark color and default.
- `ListIconMark({ icon, iconColor, kind, className, iconClassName })`: list mark.
- `ListView({ treeList })`, `ListHeader`, `ItemsView`, `ItemEntry`: list components.
- `useListItems`, `useUpdateList`, `useReorderItems`, `listKeys`: list API hooks and query keys.
- `resolvePinned`, `defaultPinned`, `pinnableFields`, `formatPrice`: list display helpers.

## Gotchas

- Icon choices are stored as `i:<name>` for built-in marks or as one emoji; the keyword aliases are vendored locally without an emoji dependency.
- Ten named colors apply only to built-in icon marks; emoji and default marks remain uncolored. The neutral tile is shared across views.
- List icon writes are owned by the tree feature and use the list version with `If-Match`.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for the full interaction spec.
