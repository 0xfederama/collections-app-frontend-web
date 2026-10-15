# search

## Purpose

Global search over every item: the sidebar field (top 8 matches in a dropdown) and the `/search?q=` results page (all matches, 50 per page). Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §6 and §1.

## Key files

- `src/features/search/api.ts`: `normalizeQuery`, `searchKeys`, `useSearch`, `useSearchResults`.
- `src/features/search/SidebarSearch.tsx`: sidebar combobox, dropdown popup, keyboard handling.
- `src/features/search/SearchResultRow.tsx`: `SearchResultBody`, `resultHref`, path line.
- `src/features/search/useSearchShortcut.ts`: `/` key outside text fields.
- `src/routes/SearchRoute.tsx`: `/search` page, URL sync, Load more.
- `src/mocks/devSearch.ts`: stateful dev fake of `GET /api/v1/search` (dev worker only).

## Interfaces

- `useSearch(q, { limit = 8, offset = 0 })`: one page for the dropdown; disabled for an empty `q`; keeps previous rows while a new query loads.
- `useSearchResults(q)`: infinite query by offset, 50 rows per page.
- `normalizeQuery(q)`: trims and caps at 200 characters (`MAX_QUERY_LENGTH`).
- `searchKeys`: `all`, `top(q, limit, offset)`, `results(q)`; `searchKeys.all` is invalidated by `invalidateContent`.
- `SidebarSearch({ inputRef })`: `form[role="search"]` with the `role="combobox"` field.
- `SearchResultBody({ result, large })`, `resultHref(result)`: row content and its link target.
- `SearchRoute()`: element of `/search`.
- `useSearchShortcut(onTrigger)`: calls `onTrigger` on `/` outside text fields.
- `devSearchHandlers`: MSW handlers used by `src/mocks/browser.ts`.

## Gotchas

- The sidebar field is an ARIA 1.2 combobox with a listbox in a Radix Popover; the `Combobox` primitive is not used because it filters on the client and always highlights row 0.
- Timing: 250 ms pause before the request; "Searching…" appears only after 150 ms of loading.
- Arrow keys cycle none → row 1 … last → none, so a plain Enter with no highlight goes to `/search?q=`.
- Enter on a highlighted row opens `/lists/:list_id/items/:id` (from `item.list_id`); the shell decides panel or full page.
- Esc closes the dropdown and keeps the text; Tab closes it too. Rows take mouse presses without moving focus.
- Path line reads `Media › Movies › Watchlist` from `SearchResult.path` (folders, then the list).
- Thumbnails in result rows are `aria-hidden`, since the title is written next to them.
- Results page URL: typing replaces `?q=` after 250 ms (no new history entry), Enter updates it at once, back/forward move the field.
- The dev fake only returns items whose list still exists in the dev tree.
