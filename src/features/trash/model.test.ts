import { describe, expect, it } from 'vitest'
import type { TrashEntry } from './api'
import {
  absoluteTime,
  blockedBy,
  blockedReason,
  countsText,
  formerParent,
  pathText,
  relativeTime,
} from './model'
import { entry } from './trashTestKit'

type Segment = TrashEntry['former_path'][number]
const crime: Segment = { type: 'list', id: 'crime-id', name: 'Crime' }
const media: Segment = { type: 'folder', id: 'media-id', name: 'Media' }

describe('AT-11 countsText', () => {
  it('leaves out zero parts', () => {
    expect(countsText({ folders: 0, lists: 3, items: 41 })).toBe('3 lists, 41 items')
    expect(countsText({ folders: 2, lists: 0, items: 5 })).toBe('2 folders, 5 items')
    expect(countsText({ folders: 1, lists: 0, items: 0 })).toBe('1 folder')
  })

  it('uses the singular for 1 and the plural otherwise', () => {
    expect(countsText({ folders: 1, lists: 1, items: 1 })).toBe('1 folder, 1 list, 1 item')
    expect(countsText({ folders: 2, lists: 2, items: 2 })).toBe('2 folders, 2 lists, 2 items')
  })

  it('counts the root itself (a lone item is "1 item")', () => {
    expect(countsText({ folders: 0, lists: 0, items: 1 })).toBe('1 item')
    expect(countsText({ folders: 0, lists: 1, items: 0 })).toBe('1 list')
  })
})

describe('AT-11 pathText', () => {
  it('is "Top level" for an empty path', () => {
    expect(pathText([])).toBe('Top level')
  })

  it('joins the segment names with a chevron', () => {
    expect(pathText([media])).toBe('Media')
    expect(pathText([media, crime])).toBe('Media › Crime')
  })
})

describe('AT-11 formerParent', () => {
  it('is the last segment of the former path, or undefined at the top level', () => {
    expect(formerParent(entry(1, { former_path: [media, crime] }))).toEqual(crime)
    expect(formerParent(entry(1, { former_path: [] }))).toBeUndefined()
  })
})

describe('AT-11 blockedBy', () => {
  const blocked = entry(1, {
    root_type: 'item',
    root_name: 'Heat',
    restorable_in_place: false,
    former_path: [media, crime],
  })

  it('offers restoring the parent when its own entry is loaded and restorable', () => {
    const parentEntry = entry(2, { root_type: 'list', root_id: crime.id, root_name: 'Crime' })
    const result = blockedBy(blocked, [blocked, parentEntry])
    expect(result.parent).toEqual(crime)
    expect(result.restoreInstead).toBe(parentEntry)
  })

  it('does not offer it when the parent entry is itself not restorable in place', () => {
    const parentEntry = entry(2, {
      root_type: 'list',
      root_id: crime.id,
      restorable_in_place: false,
    })
    const result = blockedBy(blocked, [blocked, parentEntry])
    expect(result.parent).toEqual(crime)
    expect(result.restoreInstead).toBeUndefined()
  })

  it('does not guess when the parent is not among the entries', () => {
    const other = entry(3, { root_type: 'list', root_id: 'someone-else' })
    expect(blockedBy(blocked, [blocked, other]).restoreInstead).toBeUndefined()
    expect(blockedBy(blocked, []).restoreInstead).toBeUndefined()
  })

  it('does not match an entry with the same id but another type', () => {
    const lookalike = entry(2, { root_type: 'folder', root_id: crime.id })
    expect(blockedBy(blocked, [lookalike]).restoreInstead).toBeUndefined()
  })

  it('has no parent for a top-level entry', () => {
    const topLevel = entry(1, { restorable_in_place: false, former_path: [] })
    expect(blockedBy(topLevel, [topLevel])).toEqual({
      parent: undefined,
      restoreInstead: undefined,
    })
  })
})

describe('AT-11 blockedReason', () => {
  it('says the parent is in Trash when its entry is known', () => {
    const parentEntry = entry(2)
    expect(blockedReason({ parent: crime, restoreInstead: parentEntry })).toBe(
      'Parent list ‘Crime’ is in Trash.',
    )
  })

  it('admits it may be gone when the parent entry is not known', () => {
    expect(blockedReason({ parent: media, restoreInstead: undefined })).toBe(
      'Parent folder ‘Media’ is in Trash or no longer exists.',
    )
  })

  it('has a generic reason without a parent', () => {
    expect(blockedReason({ parent: undefined, restoreInstead: undefined })).toBe(
      'Its original location is no longer available.',
    )
  })
})

describe('AT-11 relativeTime', () => {
  const now = Date.parse('2026-10-14T12:00:00Z')
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString()

  it('rounds to the largest unit', () => {
    expect(relativeTime(ago(10), now)).toBe('just now')
    expect(relativeTime(ago(5 * 60), now)).toBe('5 minutes ago')
    expect(relativeTime(ago(2 * 3600), now)).toBe('2 hours ago')
    expect(relativeTime(ago(24 * 3600), now)).toBe('yesterday')
    expect(relativeTime(ago(20 * 24 * 3600), now)).toBe('20 days ago')
  })

  it('formats an absolute time for the hover title', () => {
    expect(absoluteTime('2026-10-14T12:00:00Z')).toMatch(/2026/)
  })
})
