# ui

## Purpose

Design-system primitives in `src/components/ui/` that features compose instead of raw HTML or Radix, plus the shared favicon tiles (`ServiceIcon`, `LinkIcon`). Spec: `design-docs/UI_SPEC.md` §11; Frosted Gallery restyle: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/components/ui/index.ts`: barrel; import primitives from `components/ui`.
- `src/components/ui/icons.ts`: the only Lucide import site; named glyphs, `kindIcons`, `kindLabels`.
- `src/components/ui/sortable.tsx`: the only `@dnd-kit` importer (pinned 0.5.0, D-061).
- `src/components/ui/fieldStyles.ts`, `returnFocus.ts`: shared input chrome; focus return.
- `src/components/ServiceIcon.tsx`: `ServiceIcon` (streaming) and `LinkIcon` (Google, Letterboxd, IMDb, Reddit) tiles.
- `src/assets/services/*.webp|svg`, `README.md`: local favicons (96 px) and vendored Simple Icons SVGs (Google, IMDb), never fetched at runtime.
- `src/dev/DevUiRoute.tsx`: `/dev/ui` gallery, dev builds only.

## Interfaces

- `Button` (`variant`, `size`, `pending`), `IconButton` (plus required `aria-label`).
- `TextField` / `TextArea`: `label`, `hint`, `error`; TextField adds `prefix`, `suffix`.
- `Select`, `Combobox`: `options`, `value`, `onValueChange`. `CountrySelect`, `CurrencySelect` (`IsoSelects.tsx`, not in the barrel).
- `SegmentedControl`, `Menu` (`trigger`, `items`), `Tooltip`, `Chip` (`tone`, `icon`), `Badge` (`kind`), `Card`, `EmptyState`, `Skeleton`.
- `Dialog`, `AlertDialog`, `Drawer`: `open` / `onOpenChange`, `initialFocus`; frosted surface.
- `ToastProvider` / `useToast()`: `(options: { kind?, title, description?, action? })`.
- `Tree<T>`: `nodes`, `expanded`, `selected`, `renderRow`, `sortable(node)`, `onReorder(move)`, `acceptsDrop(target, sourceId)`.
- `SortableProvider({ onMove })`, `useSortableRow(id, slot)`, `arrayMove`.
- `ServiceIcon({ name, paid?, size? })`, `LinkIcon({ name, size? })`.

## Gotchas

- Import Lucide icons only from `./icons`; import dnd-kit only through `sortable.tsx`.
- Drag reorder is the whole row: press and drag, or Space then arrows on the keyboard. There is no grip or `Reorder <name>` button.
- "Drop into" is pointer-only: a `into:<id>` droppable on a row is live while the pointer is over its middle, and only with `acceptsDrop`. Keyboard drags never drop into.
- `Tree` is controlled and has no expand chevron: selecting a row (click, Enter, Space) is what toggles a folder.
- Focus anywhere in a row makes it the roving stop; keys pressed inside a row's own buttons are ignored by the tree.
- Unknown streaming services render as a text `Chip`; the `$` badge marks paid platforms, and every tile has a text label.
- Google and IMDb use their vendored Simple Icons SVG marks, not favicons.
- Dialog, AlertDialog and Drawer return focus to the element focused when they opened; a Dialog from a Menu item returns it to the menu trigger.
- `useToast()` throws outside `ToastProvider`. Error toasts stay 8 s, others 5 s. Toast `action` is a callback, not a `Link`.
- Use semantic token classes only (see [theme](theme.md)); no raw colors or radii.
- `Combobox` selects its text on focus. `/dev/ui` is lazy-loaded only in dev builds.
