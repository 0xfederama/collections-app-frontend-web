import { describe, expect, it } from 'vitest'
import type { TreeHit } from '../../../components/ui'
import { devTree } from '../../../mocks/devData'
import { createTreeIndex } from '../api'
import { dropSteps, projectDrop } from './drop'

const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
const index = createTreeIndex(devTree)

const MEDIA = 1
const MOVIES = 2
const FESTIVAL = 3
const CANNES = 13
const TV = 4
const VEHICLES = 5
const GEAR = 6
const EMPTY = 7
const WATCHLIST = 11
const SEEN = 12
const WISHLIST = 18
const IDEAS = 19
const OWNER = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000009'

// Media (Movies (Festival picks (Cannes), Watchlist, Seen), TV (Currently watching)), Vehicles (2 lists),
// Gear (Gadgets), Empty folder, then the lists Wishlist and Ideas.
const ALL_OPEN = new Set([1, 2, 3, 4, 5, 6].map(id))
const CLOSED = new Set<string>()

const before = (n: number): TreeHit => ({ rowId: id(n), zone: 'before' })
const after = (n: number): TreeHit => ({ rowId: id(n), zone: 'after' })
const into = (n: number): TreeHit => ({ rowId: id(n), zone: 'into' })
const end: TreeHit = { end: true }

/** [parent, before, indicator] of a drop, `'forbidden'` when refused. */
function run(
  source: number,
  hit: TreeHit,
  {
    expanded = ALL_OPEN,
    meId,
    tree = index,
  }: { expanded?: Set<string>; meId?: string; tree?: typeof index } = {},
) {
  const drop = projectDrop({ index: tree, expanded, meId }, id(source), hit)
  if (!drop) return 'forbidden'
  const where = (rowId: string) => Number(rowId.slice(-12))
  const marker = drop.indicator
    ? drop.indicator.kind === 'into'
      ? `into ${where(drop.indicator.rowId)}`
      : `${drop.indicator.edge} ${where(drop.indicator.rowId)} @${drop.indicator.level}`
    : 'none'
  return [
    drop.parentId === null ? null : where(drop.parentId),
    drop.beforeId === null ? null : where(drop.beforeId),
    marker,
  ]
}

describe('web 3.3.0 projectDrop: top and bottom of a row', () => {
  it.each<[string, number, TreeHit, unknown]>([
    [
      'a list between two children of an open folder (top of the lower)',
      WISHLIST,
      before(SEEN),
      [MOVIES, SEEN, 'before 12 @3'],
    ],
    [
      'a list on the top of the first child',
      WISHLIST,
      before(WATCHLIST),
      [MOVIES, WATCHLIST, 'before 11 @3'],
    ],
    [
      'a list on the bottom of a list: before the next sibling',
      WISHLIST,
      after(WATCHLIST),
      [MOVIES, SEEN, 'before 12 @3'],
    ],
    [
      'a list on the bottom of the last child: the end of the folder',
      WISHLIST,
      after(SEEN),
      [MOVIES, null, 'after 12 @3'],
    ],
    [
      'a list on the bottom of an open folder: its first list',
      WISHLIST,
      after(MOVIES),
      [MOVIES, WATCHLIST, 'before 11 @3'],
    ],
    [
      'a folder on the bottom of an open folder: its first folder',
      GEAR,
      after(MOVIES),
      [MOVIES, FESTIVAL, 'before 3 @3'],
    ],
    [
      'an item nested in the open folder, on the bottom of its deepest row',
      WISHLIST,
      after(CANNES),
      [FESTIVAL, null, 'after 13 @4'],
    ],
  ])('%s', (_name, source, hit, expected) => {
    expect(run(source, hit)).toEqual(expected)
  })

  it('a closed folder: the bottom means after it, in its parent', () => {
    expect(run(SEEN, after(MEDIA), { expanded: CLOSED })).toEqual([null, WISHLIST, 'before 18 @1'])
    expect(run(GEAR, after(MEDIA), { expanded: CLOSED })).toEqual([null, VEHICLES, 'before 5 @1'])
    expect(run(GEAR, after(VEHICLES), { expanded: CLOSED })).toEqual([null, EMPTY, 'none'])
  })

  it('an empty folder never counts as open', () => {
    expect(run(WISHLIST, after(EMPTY), { expanded: new Set([id(EMPTY)]) })).toEqual([
      null,
      IDEAS,
      'none',
    ])
  })
})

describe('web 3.3.0 projectDrop: into a folder', () => {
  it.each<[string, number, TreeHit, unknown]>([
    ['a list into a folder, at the end', WISHLIST, into(GEAR), [GEAR, null, 'into 6']],
    [
      'a list into a folder that has lists: after the last',
      IDEAS,
      into(MOVIES),
      [MOVIES, null, 'into 2'],
    ],
    ['a folder into a folder', GEAR, into(VEHICLES), [VEHICLES, null, 'into 5']],
    [
      'a folder into a folder that has folders: after the last folder',
      GEAR,
      into(MOVIES),
      [MOVIES, null, 'into 2'],
    ],
    ['a folder into a sibling', VEHICLES, into(MEDIA), [MEDIA, null, 'into 1']],
    ['into a collapsed folder', WISHLIST, into(MEDIA), [MEDIA, null, 'into 1']],
  ])('%s', (_name, source, hit, expected) => {
    expect(run(source, hit)).toEqual(expected)
  })

  it('a list cannot be "into" a list', () => {
    expect(run(WISHLIST, into(IDEAS))).toBe('forbidden')
  })

  it('into the folder it is already in moves it to the end (a reorder)', () => {
    expect(run(MOVIES, into(MEDIA))).toEqual([MEDIA, null, 'into 1'])
  })
})

describe('web 3.3.0 projectDrop: out to the top level', () => {
  it.each<[string, number, TreeHit, unknown]>([
    ['a folder between two top-level folders', FESTIVAL, before(GEAR), [null, GEAR, 'before 6 @1']],
    [
      'a folder at the top of the first top-level row',
      TV,
      before(MEDIA),
      [null, MEDIA, 'before 1 @1'],
    ],
    ['a list between top-level lists', SEEN, before(IDEAS), [null, IDEAS, 'before 19 @1']],
    [
      'a list dropped between folders snaps before the first list',
      WATCHLIST,
      before(GEAR),
      [null, WISHLIST, 'before 18 @1'],
    ],
    [
      'a list below the last row: the end of the top level',
      WATCHLIST,
      end,
      [null, null, 'after 19 @1'],
    ],
    ['a folder below the last row: after the last folder', TV, end, [null, null, 'before 18 @1']],
  ])('%s', (_name, source, hit, expected) => {
    expect(run(source, hit)).toEqual(expected)
  })
})

describe('web 3.3.0 projectDrop: folders before lists', () => {
  it.each<[string, number, TreeHit, unknown]>([
    [
      'a folder on a list of another parent: after the last folder there',
      GEAR,
      before(WATCHLIST),
      [MOVIES, null, 'before 11 @3'],
    ],
    [
      'a folder below the last list: after the last folder there',
      GEAR,
      after(SEEN),
      [MOVIES, null, 'before 11 @3'],
    ],
    [
      'a list on a folder: before the first list there',
      WISHLIST,
      before(FESTIVAL),
      [MOVIES, WATCHLIST, 'before 11 @3'],
    ],
    [
      'a list on a folder of a folder with no lists: its end',
      WISHLIST,
      before(TV),
      [MEDIA, null, 'after 14 @2'],
    ],
    [
      'a folder on a root list: after the last root folder',
      TV,
      before(IDEAS),
      [null, null, 'before 18 @1'],
    ],
  ])('%s', (_name, source, hit, expected) => {
    expect(run(source, hit)).toEqual(expected)
  })
})

describe('web 3.3.0 projectDrop: reordering inside one parent', () => {
  it('a folder after the next one (closed: its bottom is the next slot)', () => {
    expect(run(MEDIA, after(VEHICLES), { expanded: CLOSED })).toEqual([null, GEAR, 'before 6 @1'])
  })

  it('a folder moved up above its sibling', () => {
    expect(run(GEAR, before(VEHICLES))).toEqual([null, VEHICLES, 'before 5 @1'])
  })

  it('a list moved above its sibling', () => {
    expect(run(SEEN, before(WATCHLIST))).toEqual([MOVIES, WATCHLIST, 'before 11 @3'])
  })

  it('a list moved to the end of its folder', () => {
    expect(run(WATCHLIST, after(SEEN))).toEqual([MOVIES, null, 'after 12 @3'])
  })
})

describe('web 3.3.0 projectDrop: drops that change nothing', () => {
  it.each([
    ['on the top of its own row', GEAR, before(GEAR), ALL_OPEN],
    ['on the top of the next sibling', GEAR, before(EMPTY), ALL_OPEN],
    ['on the bottom of its own closed row', GEAR, after(GEAR), CLOSED],
    ['on the bottom of the previous sibling when it is closed', GEAR, after(VEHICLES), CLOSED],
    ['a list on the top of the next list', WISHLIST, before(IDEAS), ALL_OPEN],
    [
      'a list on the top of a folder (it is already the first list)',
      WISHLIST,
      before(GEAR),
      ALL_OPEN,
    ],
    ['into the folder it is already last in', SEEN, into(MOVIES), ALL_OPEN],
    ['the last list below everything', IDEAS, end, ALL_OPEN],
  ])('%s: no indicator, same place', (_name, source, hit, expanded) => {
    const drop = projectDrop({ index, expanded }, id(source), hit)
    expect(drop?.indicator).toBeNull()
  })
})

describe('web 3.3.0 projectDrop: forbidden targets', () => {
  it.each([
    ['a folder into itself', MEDIA, into(MEDIA)],
    ['a folder into its child', MEDIA, into(MOVIES)],
    ['a folder into its grandchild', MEDIA, into(FESTIVAL)],
    ['a folder between its own children', MEDIA, before(TV)],
    ['a folder at the bottom of its own open row (its first child)', MEDIA, after(MEDIA)],
    ['a folder at the bottom of one of its descendants', MEDIA, after(CANNES)],
    ['a row that is not shown', GEAR, { rowId: 'missing', zone: 'before' }],
  ] as const)('%s', (_name, source, hit) => {
    expect(run(source, hit)).toBe('forbidden')
  })

  it('an unknown source', () => {
    expect(projectDrop({ index, expanded: ALL_OPEN }, 'missing', end)).toBeNull()
  })
})

describe('F-027 web 3.3.0 projectDrop: rights', () => {
  const shared = structuredClone(devTree)
  const gear = shared.folders.find((f) => f.id === id(GEAR))!
  gear.member_user_ids = [OTHER]
  gear.shared = true
  shared.folders.find((f) => f.id === id(EMPTY))!.owner_user_id = OTHER
  const sharedIndex = createTreeIndex(shared)
  const as = (source: number, hit: TreeHit) => run(source, hit, { meId: OWNER, tree: sharedIndex })

  it('a shared folder I own cannot go into a folder, nor nested', () => {
    expect(as(GEAR, into(MEDIA))).toBe('forbidden')
    expect(as(GEAR, before(FESTIVAL))).toBe('forbidden')
  })

  it('someone else’s top-level folder cannot change parent', () => {
    expect(as(EMPTY, into(MEDIA))).toBe('forbidden')
    expect(as(EMPTY, before(MOVIES))).toBe('forbidden')
  })

  it('but both still reorder among the top-level folders', () => {
    expect(as(GEAR, before(VEHICLES))).toEqual([null, VEHICLES, 'before 5 @1'])
    expect(as(EMPTY, before(VEHICLES))).toEqual([null, VEHICLES, 'before 5 @1'])
  })

  it('my private folder and lists move freely', () => {
    expect(as(VEHICLES, into(MEDIA))).toEqual([MEDIA, null, 'into 1'])
    expect(as(WISHLIST, into(MEDIA))).toEqual([MEDIA, null, 'into 1'])
  })

  it('a nested folder moves out of a shared box to the top level', () => {
    expect(as(MOVIES, before(VEHICLES))).toEqual([null, VEHICLES, 'before 5 @1'])
  })
})

describe('web 3.3.0 dropSteps: the keyboard path walks the siblings', () => {
  const steps = (source: number) =>
    dropSteps({ index, expanded: ALL_OPEN }, id(source)).map((s) => [
      s.beforeId ? Number(s.beforeId.slice(-12)) : null,
      s.indicator === null,
    ])

  it('top-level folders: every slot, the current one marked', () => {
    expect(steps(MEDIA)).toEqual([
      [VEHICLES, true],
      [GEAR, false],
      [EMPTY, false],
      [null, false],
    ])
    expect(steps(GEAR)).toEqual([
      [MEDIA, false],
      [VEHICLES, false],
      [EMPTY, true],
      [null, false],
    ])
  })

  it('lists inside a folder', () => {
    expect(steps(WATCHLIST)).toEqual([
      [SEEN, true],
      [null, false],
    ])
  })

  it('an only child has a single, unchanged slot', () => {
    expect(steps(CANNES)).toEqual([[null, true]])
  })

  it('an unknown row has no steps', () => {
    expect(dropSteps({ index, expanded: ALL_OPEN }, 'missing')).toEqual([])
  })
})
