# ui

## Purpose

Design-system primitives in `src/components/ui/` that features compose instead of raw HTML or Radix. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §11.

## Key files

- `src/components/ui/index.ts`: barrel; import primitives from `components/ui`.
- `src/components/ui/icons.ts`: the only Lucide import site; `kindIcons` and `kindLabels` per `ItemKind`.
- `src/components/ui/fieldStyles.ts`: shared input chrome (`controlBase`, `controlBorder`).
- `src/lib/cx.ts`: class-name joiner used by every primitive.
- `src/dev/DevUiRoute.tsx`: component gallery at `/dev/ui`, dev builds only.
- `*.test.tsx` beside Button, IconButton, Combobox, Menu, Select, SegmentedControl, TextField, TextArea.

## Interfaces

- `Button`: `variant` (primary, secondary, ghost, danger), `size` (sm, md), `pending` (spinner, `aria-busy`, blocks activation).
- `IconButton`: Button variants plus required `aria-label`.
- `TextField` / `TextArea`: `label`, `hint`, `error` (sets `aria-invalid`, `aria-describedby`); TextField adds `prefix`, `suffix`.
- `Select`: `options: SelectOption[]`, `value`, `onValueChange`, `placeholder`; wraps Radix Select.
- `Combobox`: `options`, `value`, `onValueChange`, `emptyMessage`; own ARIA combobox/listbox inside a Radix Popover.
- `SegmentedControl`: `aria-label`, `options` (`value`, `label`, `icon`, `iconOnly`), `value`, `onValueChange`; native radio group.
- `Menu`: `trigger`, `items: MenuItem[]` (`onSelect`, `destructive`, `disabled`, or `{ type: 'separator' }`), `align`; Radix DropdownMenu.
- `Dialog`: `title`, `description`, `footer`, `open` / `onOpenChange`, `trigger`; Radix Dialog.
- `AlertDialog`: `title`, `description`, `onConfirm`, `destructive`, `pending`, `confirmLabel` / `cancelLabel`.
- `Drawer`: `title`, `side` (left, right), `open` / `onOpenChange`, `trigger`; Radix Dialog.
- `Tooltip`: `content`, `side`, single child element (asChild); 300 ms delay.
- `ToastProvider` / `useToast()`: `useToast()` returns `(options: { kind?, title, description? }) => void`.
- `Tree<T>`: `nodes`, `expanded` / `onExpandedChange`, `selected` / `onSelectedChange`, `renderRow`, `aria-label`.
- `Card`: `interactive` flag. `Chip`: `tone` (neutral, accent, success, warning, danger), `icon`.
- `Badge`: `kind: ItemKind` (icon plus text label).
- `Breadcrumbs`: `items: { label, to? }[]`; links via react-router.
- `EmptyState`: `icon`, `title`, `description`, `action`, `headingLevel`.
- `Skeleton`: `className`; decorative pulse block (`aria-hidden`).

## Gotchas

- Import Lucide icons only from `./icons`, never from `lucide-react` directly.
- `useToast()` throws outside `ToastProvider`. Error toasts stay 8 s, others 5 s.
- `Tree` is controlled: the parent owns `expanded` and `selected`.
- `Chip` always renders its text, so state is never color alone.
- `/dev/ui` is lazy-loaded only when `import.meta.env.DEV`; it is absent from production.
- Use semantic token classes only (see the theme module doc); no raw colors or radii.
