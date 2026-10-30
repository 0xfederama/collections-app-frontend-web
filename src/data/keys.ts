// Query keys of every server resource (F020-W4). The values are the cache identities: changing one
// changes what is invalidated, so they are fixed. Imports nothing from features (eslint.boundaries.js,
// rule A), so features import the keys from here and never the other way round.

/** Folder and list tree (`GET /tree`). */
export const treeKeys = { tree: ['tree'] as const }

/** The parameters of one items query of a list (the URL state of the list view, W-06). */
export interface ItemsKeyParams {
  /** The URL override; `null` lets the server use the list's `sort_mode` (D-063). */
  sort: string | null
  q: string
  filterField: string | null
  filterValue: string | null
  filterMin: string | null
  filterMax: string | null
}

/** Exported so other features (W-05, W-06, W-07) invalidate by key, not by string literal. */
export const listKeys = {
  detail: (listId: string) => ['lists', listId, 'detail'] as const,
  /** Prefix of every items query of a list, whatever its sort or filter. */
  items: (listId: string) => ['lists', listId, 'items'] as const,
  itemsQuery: (listId: string, params: ItemsKeyParams) =>
    [
      'lists',
      listId,
      'items',
      params.sort,
      params.q,
      params.filterField,
      params.filterValue,
      params.filterMin,
      params.filterMax,
    ] as const,
}

/** First path segment of the list and item query keys (`listKeys`, `itemKeys`); see `trash/api.test.ts`. */
export const LISTS_KEY_ROOT = 'lists'
export const ITEMS_KEY_ROOT = 'items'

/** Exported so other features (W-08, W-09, W-10) invalidate by key, not by string literal. */
export const itemKeys = {
  detail: (itemId: string) => ['items', itemId, 'detail'] as const,
  content: (itemId: string) => ['items', itemId, 'content'] as const,
}

/** Saved versions of an item's description (the history drawer). */
export const contentKeys = {
  versions: (itemId: string) => ['items', itemId, 'content-versions'] as const,
  version: (itemId: string, version: number) =>
    ['items', itemId, 'content-versions', version] as const,
}

/** Exported so other features can invalidate searches after item changes (W-07, W-08, W-10). */
export const searchKeys = {
  all: ['search'] as const,
  top: (q: string, limit: number, offset: number) => ['search', 'top', q, limit, offset] as const,
  results: (q: string) => ['search', 'results', q] as const,
}

/** Exported so item changes elsewhere can invalidate Home's block by key. */
export const homeKeys = { recent: ['recent-items'] as const }

/** Exported so other features can invalidate the trash by key, not by string literal. */
export const trashKeys = { all: ['trash'] as const, list: ['trash', 'list'] as const }

export const settingsKeys = { settings: ['settings'] as const }
export const typeKeys = { types: ['types'] as const }

export const storeKeys = { providers: ['store-providers'] as const }

export const healthKeys = { ready: ['health', 'readyz'] as const }
