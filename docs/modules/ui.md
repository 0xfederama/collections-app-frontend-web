# ui

## Purpose

Design-system primitives in `src/components/ui/` that features compose instead of raw HTML or Radix, plus the shared favicon tiles (`ServiceIcon`, `LinkIcon`) and the website icon (`SiteIcon`). Spec: `design-docs/UI_SPEC.md` §11; Editorial restyle: `design-docs/features/F-021-web-restyle.md`.

## Key files

- `src/components/ui/index.ts`: barrel; import primitives from `components/ui`.
- `src/components/ui/icons.ts`: the only Lucide import site; named glyphs, `typeIcons`, `typeLabels` (five built-in types, plural names; no type = `List`).
- `src/components/ui/sortable.tsx`: the only `@dnd-kit` importer (pinned 0.5.0, D-061).
- `src/components/ui/SharedBadge.tsx`: two-person mark on the bottom right of a shared folder's icon (F-027).
- `src/components/ui/fieldStyles.ts`, `returnFocus.ts`: shared input chrome; focus return.
- `src/components/UserAvatar.tsx`: `UserAvatar({ name?, email?, avatarUrl?, size? })`, https-only image (`alt=""`, no referrer) with a letter-tile fallback (also on load error); `rounded-full`.
- `src/components/ServiceIcon.tsx`: `ServiceIcon` (streaming) and `LinkIcon` (Google, Letterboxd, IMDb, Reddit) tiles, `TILE_SIZE`.
- `src/components/SiteIcon.tsx`: `SiteIcon` (favicon or globe) for website links; the favicon URL comes from [links](links.md).
- `src/lib/text.ts`: `firstLetter`, shared by the letter tile and the item-cover placeholder.
- `src/assets/services/*.svg`, `README.md`: every link, store and streaming icon as a local SVG (source, licence and date per file in the README), never fetched at runtime. `src/components/serviceIcons/` is the registry: `entries.ts` (link and store rows), `streamingEntries.ts` (streaming rows; one file may back several entries, e.g. Apple TV Store and Apple TV+), `registry.ts` (`findService`, `sortByServiceOrder`, derived `STREAMING_SERVICES`), `owned.ts` (`filterOwnedPlatforms`, `orderPlatforms`, `STREAMING_OFFERED`). A unit test fails on a file without an entry or the reverse.
- `src/dev/DevUiRoute.tsx`: `/dev/ui` gallery, dev builds only.

## Interfaces

- `Button` (`variant`: `primary`, `ink`, `secondary`, `ghost`, `danger`; `size`, `pending`), `IconButton` (plus required `aria-label`). `ink` is the Quick add button only.
- `TextField` / `TextArea`: `label`, `hint`, `error`; TextField adds `prefix`, `suffix`.
- `Select`, `Combobox`: `options`, `value`, `onValueChange`. `CountrySelect`, `CurrencySelect` (`IsoSelects.tsx`, not in the barrel).
- `SegmentedControl` (`options` with `iconOnly`, `size` `default` | `toolbar` for the 36 px toolbar tray), `Menu` (`trigger`, `items`; optional controlled `open` / `onOpenChange`), `Tooltip`, `Chip` (`tone`, `icon`), `Badge` (`type`), `Card`, `EmptyState`, `Skeleton`.
- `Dialog`, `AlertDialog`, `Drawer`: `open` / `onOpenChange`, `initialFocus`; solid surface. `Drawer` also takes `className` (panel padding).
- `ToastProvider` / `useToast()`: `(options: { kind?, title, description?, action? })`.
- `Tree<T>`: `nodes`, `expanded`, `selected`, `renderRow`, `sortable(node)`, `onReorder(move)`, `acceptsDrop(target, sourceId)`.
- `SortableProvider({ onMove })`, `useSortableRow(id, slot)` (returns `cancelDrag()`), `arrayMove`.
- `ServiceIcon({ name, paid?, size? })`, `LinkIcon({ name, size? })`; both default to `TILE_SIZE` (32, was 44 before F-025).
- `SiteIcon({ src, size?, tile? })`: `src` `null` shows the globe; `tile` draws it in the row tile frame.
- `SharedBadge({ shared, children, className? })`: overlays the `Users` mark on `children`; renders `children` unchanged when `shared` is false.

## Gotchas

- Import Lucide icons only from `./icons`; import dnd-kit only through `sortable.tsx`.
- `SharedBadge` is decorative (`aria-hidden`): the row or link name must also say "shared" (sr-only), as the tree and rail do.
- Drag reorder is the whole row: press and drag, or Space then arrows on the keyboard. There is no grip or `Reorder <name>` button.
- "Drop into" is pointer-only: a `into:<id>` droppable on a row is live while the pointer is over its middle, and only with `acceptsDrop`. Keyboard drags never drop into.
- `Tree` is controlled and has no expand chevron: selecting a row (click, Enter, Space) is what toggles a folder.
- Focus anywhere in a row makes it the roving stop; keys pressed inside a row's own buttons are ignored by the tree.
- Every link and streaming icon is the same tile (`TILE_SIZE`, `rounded-sm`). Each `inset` mark sits in an 18% inset on the white `tile: 'light'` surface (theme-independent); `fit: 'bleed'` icons keep their own background. `chili.svg` wraps an unmodified raster logo. An unknown service is a letter tile, never a text `Chip`; the `$` badge marks paid platforms and the tile's own text label names it.
- Only `size` varies between callers: a tight list row asks for a smaller tile, the shape, radius and padding do not change.
- `SiteIcon` falls back to the globe when `src` is `null` or the image fails; the failed URL is remembered, so a different `src` gets its own try.
- Google and IMDb use their vendored Simple Icons SVG marks, not favicons. Those two SVGs carry no white background: the tile owns the surface.
- Dialog, AlertDialog and Drawer return focus to the element focused when they opened; a Dialog from a Menu item returns it to the menu trigger.
- `useToast()` throws outside `ToastProvider`. Error toasts stay 8 s, others 5 s. Toast `action` is a callback, not a `Link`.
- Use semantic token classes only (see [theme](theme.md)); no raw colors or radii.
- `Combobox` selects its text on focus. `/dev/ui` is lazy-loaded only in dev builds.
