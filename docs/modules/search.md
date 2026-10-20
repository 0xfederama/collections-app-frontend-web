# search

## Purpose

Global item search in the sidebar dropdown and `/search?q=` results page.

## Key files

- `src/features/search/index.ts`: public face; `api.ts`: query hooks; `searchKeys` is in `src/data/keys.ts`.
- `useSearchShortcut.ts`: the `/` shortcut.
- `SidebarSearch.tsx`: sidebar combobox and popup.
- `SearchResultRow.tsx`: result body, type name, path and list mark.
- `src/routes/SearchRoute.tsx`: results page.
- `src/mocks/devSearch.ts`: dev worker fake.

## Interfaces

- `useSearch(q, options)`, `useSearchResults(q)` (`api.ts`); `searchKeys` from `src/data/keys.ts`.
- `normalizeQuery(q)`: trims and caps the query at 200 characters.
- `SidebarSearch({ inputRef })`, `SearchResultBody({ result, large })`, `resultHref(result)`.
- `SearchRoute()`, `useSearchShortcut(onTrigger)`.

## Gotchas

- Each result carries `type_name` (the type's display name from the API); it is shown as a tooltip and screen-reader text beside the type mark.
- Search result path entries carry list icon fields; the list mark is shown beside the list name in results.
- Sidebar search is a combobox with a Radix Popover listbox; arrow keys move its active result and Enter opens it.
- Requests pause 250 ms; the dropdown shows its loading state after 150 ms.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for route and accessibility details.
