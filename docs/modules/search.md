# search

## Purpose

Global item search in the sidebar dropdown and `/search?q=` results page.

## Key files

- `src/features/search/api.ts`: query hooks and keys.
- `SidebarSearch.tsx`: sidebar combobox and popup.
- `SearchResultRow.tsx`: result body, kind name, path and list mark.
- `src/routes/SearchRoute.tsx`: results page.
- `src/mocks/devSearch.ts`: dev worker fake.

## Interfaces

- `useSearch(q, options)`, `useSearchResults(q)`, `searchKeys`.
- `normalizeQuery(q)`: trims and caps the query at 200 characters.
- `SidebarSearch({ inputRef })`, `SearchResultBody({ result, large })`, `resultHref(result)`.
- `SearchRoute()`, `useSearchShortcut(onTrigger)`.

## Gotchas

- Each result carries `kind_name` (the kind's display name from the API); it is shown as a tooltip and screen-reader text beside the kind mark.
- Search result path entries carry list icon fields; the list mark is shown beside the list name in results.
- Sidebar search is a combobox with a Radix Popover listbox; arrow keys move its active result and Enter opens it.
- Requests pause 250 ms; the dropdown shows its loading state after 150 ms.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for route and accessibility details.
