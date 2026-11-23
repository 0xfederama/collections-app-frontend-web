/** The part of an item the share text needs. Later options (fields, descriptions) extend this. */
export interface ShareItem {
  title: string
}

export interface ShareTextOptions {
  /** One line per item; the default is `* Title`. */
  formatItem?: (item: ShareItem) => string
}

const bullet = (item: ShareItem) => `* ${item.title}`

/** The plain-text list of the shown items, in order, titles verbatim. Empty input gives ''. */
export function buildShareText(
  items: readonly ShareItem[],
  { formatItem = bullet }: ShareTextOptions = {},
): string {
  return items.map(formatItem).join('\n')
}
