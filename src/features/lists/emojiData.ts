/**
 * The full emoji set, loaded on demand: `emojibase-data` (MIT, Unicode CLDR English names and tags).
 * The JSON files are dynamic imports, so they are separate chunks that only download when the Emoji
 * tab opens. Skin-tone variants are left out (the base emoji is shown) and so is anything newer
 * than `MAX_EMOJI_VERSION`, which older iOS and Android releases draw as a box.
 */
interface EmojiEntry {
  emoji: string
  name: string
  /** Lower-cased name and tag words, matched by prefix. */
  words: string[]
}
export interface EmojiGroup {
  key: string
  label: string
  emoji: EmojiEntry[]
}

/** iOS 17 and Android 14 draw Emoji 15.0; 15.1 and later are left out. */
const MAX_EMOJI_VERSION = 15

/** emojibase group numbers, in display order (2 = skin-tone components is not offered). */
const GROUPS: [number, string][] = [
  [0, 'Smileys & emotion'],
  [1, 'People & body'],
  [3, 'Animals & nature'],
  [4, 'Food & drink'],
  [5, 'Travel & places'],
  [6, 'Activities'],
  [7, 'Objects'],
  [8, 'Symbols'],
  [9, 'Flags'],
]

export interface CompactRow {
  hexcode: string
  label: string
  unicode: string
  group?: number
  order?: number
  tags?: string[]
}

let cache: Promise<EmojiGroup[]> | null = null

/** Loads and groups the emoji once; a failed load can be retried. */
export function loadEmoji(): Promise<EmojiGroup[]> {
  cache ??= Promise.all([
    import('emojibase-data/en/compact.json'),
    import('emojibase-data/versions/emoji.json'),
  ])
    .then(([compact, versions]) =>
      buildGroups(compact.default as CompactRow[], versions.default as Record<string, string[]>),
    )
    .catch((error: unknown) => {
      cache = null
      throw error
    })
  return cache
}

export function buildGroups(
  rows: CompactRow[],
  versions: Record<string, string[]>,
  maxVersion = MAX_EMOJI_VERSION,
): EmojiGroup[] {
  const tooNew = new Set<string>()
  for (const [version, hexcodes] of Object.entries(versions)) {
    if (Number(version) > maxVersion) hexcodes.forEach((hex) => tooNew.add(hex))
  }
  return GROUPS.map(([group, label]) => ({
    key: String(group),
    label,
    emoji: rows
      .filter((row) => row.group === group && !tooNew.has(row.hexcode))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((row) => ({
        emoji: row.unicode,
        name: row.label,
        words: [row.label, ...(row.tags ?? [])].join(' ').toLocaleLowerCase().split(/\s+/),
      })),
  })).filter((group) => group.emoji.length > 0)
}

/** Every word typed must start a word of the name or tags ("camer" finds camera). */
export function searchEmoji(groups: EmojiGroup[], query: string): EmojiGroup[] {
  const typed = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (typed.length === 0) return groups
  return groups
    .map((group) => ({
      ...group,
      emoji: group.emoji.filter((entry) =>
        typed.every((word) => entry.words.some((candidate) => candidate.startsWith(word))),
      ),
    }))
    .filter((group) => group.emoji.length > 0)
}
