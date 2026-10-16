const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * First grapheme of a title, upper case (`?` for an empty one). Shared by the item-cover
 * placeholder (`ItemInitial`) and the icon tiles that have no logo (`ServiceIcon`), so both
 * letter tiles are the same letter of the same name.
 */
export const firstLetter = (title: string) => {
  const first = graphemes.segment(title.trim())[Symbol.iterator]().next()
  return first.done ? '?' : first.value.segment.toLocaleUpperCase()
}
