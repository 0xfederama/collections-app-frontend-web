# ui

## Purpose

Design-system primitives in `src/components/ui/` that features compose instead of raw HTML or Radix. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §11.

## Key files

- `src/components/ui/index.ts`: barrel; import primitives from `components/ui`.
- `src/components/ui/icons.ts`: the only Lucide import site; named glyphs, `kindIcons` and `kindLabels`.
- `src/components/ui/fieldStyles.ts`: shared input chrome (`controlBase`, `controlBorder`).
- `src/components/ui/sortable.tsx`: the only importer of `@dnd-kit` (pinned 0.5.0, D-061); `SortableProvider`, `useSortableRow`, `arrayMove`.
- `src/components/ui/returnFocus.ts`: focus return for Dialog, AlertDialog, Drawer; `rememberMenuTrigger` (used by Menu).
- `src/lib/cx.ts`: class-name joiner used by every primitive.
- `src/dev/DevUiRoute.tsx`: component gallery at `/dev/ui`, dev builds only.
- `*.test.tsx` beside most primitives.

## Interfaces

- `Button`: `variant` (primary, secondary, ghost, danger), `size` (sm, md), `pending` (spinner, `aria-busy`, blocks activation).
- `IconButton`: Button variants plus required `aria-label`.
- `TextField` / `TextArea`: `label`, `hint`, `error` (sets `aria-invalid`, `aria-describedby`); TextField adds `prefix`, `suffix`.
- `Select`, `Combobox`: `options`, `value`, `onValueChange`; Select wraps Radix Select, Combobox is an ARIA combobox in a Popover.
- `CountrySelect`, `CurrencySelect` (`IsoSelects.tsx`): Combobox over ISO 3166 countries and ISO 4217 currencies; value is the code, names from `src/lib/iso.ts`. Used by the item form and Settings.
- `SegmentedControl`: `aria-label`, `options` (`value`, `label`, `icon`, `iconOnly`), `value`, `onValueChange`.
- `Menu`: `trigger`, `items: MenuItem[]` (`onSelect`, `destructive`, `disabled`, or `{ type: 'separator' }`), `align`.
- `Dialog`: `title`, `description`, `footer`, `open` / `onOpenChange`, `trigger`, `initialFocus` (ref to focus on open instead of Close).
- `AlertDialog`: `title`, `description`, `onConfirm`, `destructive`, `pending`, `confirmLabel` / `cancelLabel`, `children` (extra content, e.g. an error), `keepOpen` (caller closes it).
- `Drawer`: `title`, `side` (left, right), `open` / `onOpenChange`, `trigger`; Radix Dialog.
- `Tooltip`: `content`, `side`, single child element (asChild); 300 ms delay.
- `ToastProvider` / `useToast()`: `useToast()` returns `(options: { kind?, title, description?, action? }) => void`; `action: { label, onAction }` renders a Radix `Toast.Action` button.
- `Tree<T>`: `nodes`, `expanded` / `onExpandedChange`, `selected` / `onSelectedChange`, `renderRow`, `sortable(node)`, `onReorder(move)`, `aria-label`.
- `Card`: `interactive`. `Chip`: `tone` (neutral, accent, success, warning, danger), `icon`. `Badge`: `kind: ItemKind`.
- `EmptyState`: `icon`, `title`, `description`, `action`, `headingLevel`. `Skeleton`: `className`.
- `SortableProvider({ onMove })`, `useSortableRow(id, slot)`: drag reorder; `SortableSlot` = `{ group, index, size, label }`.

## Gotchas

- Import Lucide icons only from `./icons`, never from `lucide-react` directly. Import dnd-kit only through `sortable.tsx`.
- `Tree` has no expand chevron: a folder's icon shows its state, and selecting the row (click, Enter, Space) is what toggles it, as decided by the parent's `onSelectedChange`.
- `Tree` is controlled: the parent owns `expanded` and `selected`. Drag reorder is opt-in: only nodes with a `sortable` slot get a `Reorder <label>` handle, and `onReorder` fires once per changed drop.
- Focus anywhere in a row (its link, menu or handle) makes it the roving stop. Keys pressed inside a row's own buttons are ignored by the tree. The whole `Tree` is one Tab stop: inner controls of other rows get `tabindex=-1` (original value kept in `data-tree-tab`), so the drag handle is reached by Tab only on the roving row.
- `useToast()` throws outside `ToastProvider`, which `App.tsx` mounts. Error toasts stay 8 s, others 5 s.
- Toast `action` is a callback, not a `Link`, because the provider sits above the router. Running it dismisses the toast.
- `Chip` always renders its text, so state is never color alone.
- `/dev/ui` is lazy-loaded only when `import.meta.env.DEV`; it is absent from production.
- Use semantic token classes only (see the theme module doc); no raw colors or radii.
- `Combobox` selects its text on focus, so typing replaces the current label.
- Dialog, AlertDialog and Drawer return focus to the element focused when they opened, since Radix only does that for its own `trigger`. A dialog opened from a Menu item returns focus to the menu's trigger (Menu hands it over for 500 ms).
