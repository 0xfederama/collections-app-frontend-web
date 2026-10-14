import type { TrashEntry } from './api'

type PathSegment = TrashEntry['former_path'][number]
type Counts = TrashEntry['counts']

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "3 lists, 41 items". The counts include the root itself (D-065); zero parts are left out. */
export function countsText(counts: Counts): string {
  const parts = [
    counts.folders > 0 && plural(counts.folders, 'folder', 'folders'),
    counts.lists > 0 && plural(counts.lists, 'list', 'lists'),
    counts.items > 0 && plural(counts.items, 'item', 'items'),
  ].filter(Boolean)
  return parts.join(', ') || 'Empty'
}

export const typeLabel: Record<TrashEntry['root_type'], string> = {
  folder: 'Folder',
  list: 'List',
  item: 'Item',
}

/** `Media › Movies`, or "Top level" for something that was at the root. */
export const pathText = (path: readonly PathSegment[]) =>
  path.length === 0 ? 'Top level' : path.map((segment) => segment.name).join(' › ')

/** The folder or list the entry came from: the last segment of its former path (D-065). */
export const formerParent = (entry: TrashEntry): PathSegment | undefined => entry.former_path.at(-1)

export interface Blocked {
  /** The original parent, named in the explanation. */
  parent: PathSegment | undefined
  /** The parent's own Trash entry, when it is among the loaded entries and can be restored in place. */
  restoreInstead: TrashEntry | undefined
}

/**
 * Why an entry can't be restored in place, and whether restoring its parent first is on offer.
 * The parent counts only when it is the root of a loaded entry that is itself restorable in
 * place: if the parent is deeper inside a bigger batch, or its entry is on a page that isn't
 * loaded, nothing is guessed and only the destination picker remains.
 */
export function blockedBy(entry: TrashEntry, entries: readonly TrashEntry[]): Blocked {
  const parent = formerParent(entry)
  const parentEntry = parent
    ? entries.find((e) => e.root_id === parent.id && e.root_type === parent.type)
    : undefined
  return {
    parent,
    restoreInstead: parentEntry?.restorable_in_place ? parentEntry : undefined,
  }
}

/** "Parent folder 'Bikes' is in Trash". */
export function blockedReason(blocked: Blocked): string {
  const { parent, restoreInstead } = blocked
  if (!parent) return 'Its original location is no longer available.'
  const what = `Parent ${parent.type} ‘${parent.name}’`
  // Without the parent's own entry we only know it is not active: in Trash, or gone.
  return restoreInstead ? `${what} is in Trash.` : `${what} is in Trash or no longer exists.`
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "2 hours ago", "yesterday". Falls back to "just now" under a minute. */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export const absoluteTime = (iso: string) =>
  new Date(iso).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })
