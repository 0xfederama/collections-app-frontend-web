/** Exported so other features can invalidate the trash by key, not by string literal. */
export const trashKeys = { all: ['trash'] as const, list: ['trash', 'list'] as const }

/** First path segment of the list and item query keys (`listKeys`, `itemKeys`); see `trash/api.test.ts`. */
export const LISTS_KEY_ROOT = 'lists'
export const ITEMS_KEY_ROOT = 'items'
