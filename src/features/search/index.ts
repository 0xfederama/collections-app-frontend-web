// Public face of the search feature (F020 boundaries): code outside features/search imports only from here.
export { MAX_QUERY_LENGTH, normalizeQuery, searchKeys, useSearchResults } from './api'
export { resultHref, SearchResultBody } from './SearchResultRow'
export { SidebarSearch } from './SidebarSearch'
export { useSearchShortcut } from './useSearchShortcut'
