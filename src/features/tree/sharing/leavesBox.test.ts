import { describe, expect, it } from 'vitest'
import { devTree } from '../../../mocks/devData'
import { MEMBER_USER_ID } from '../../../mocks/users'
import { createTreeIndex } from '../api'
import { leavesSharedBox } from './leavesBox'

const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
const [MEDIA, MOVIES, FESTIVAL, TV, VEHICLES, GEAR] = [id(1), id(2), id(3), id(4), id(5), id(6)]
const [WATCHLIST, CANNES, GADGETS, WISHLIST] = [id(11), id(13), id(17), id(18)]

function index(shared: string[]) {
  const tree = structuredClone(devTree)
  for (const folder of tree.folders) {
    if (shared.includes(folder.id)) {
      folder.shared = true
      folder.member_user_ids = [MEMBER_USER_ID]
    }
  }
  return createTreeIndex(tree)
}

describe('F-027 W5 leavesSharedBox', () => {
  const idx = index([MEDIA])

  it.each([
    ['a nested list to my top level', WATCHLIST, null, MEDIA],
    ['a nested list to a private folder', WATCHLIST, GEAR, MEDIA],
    ['a deep list to a private folder', CANNES, VEHICLES, MEDIA],
    ['a nested folder to my top level', MOVIES, null, MEDIA],
    ['a deep folder to a private folder', FESTIVAL, GEAR, MEDIA],
  ])('asks when moving %s', (_label, source, destination, expected) => {
    expect(leavesSharedBox(idx, source, destination)?.id).toBe(expected)
  })

  it.each([
    ['a list to another folder of the same box', WATCHLIST, TV],
    ['a list to the box root itself', WATCHLIST, MEDIA],
    ['a folder to a deeper folder of the same box', TV, FESTIVAL],
    ['a private list into a shared folder', WISHLIST, MEDIA],
    ['a private nested list to a private folder', GADGETS, VEHICLES],
    ['a private list to my top level', GADGETS, null],
  ])('does not ask when moving %s', (_label, source, destination) => {
    expect(leavesSharedBox(idx, source, destination)).toBeNull()
  })

  it('does not ask for a top-level folder, which is its own box', () => {
    expect(leavesSharedBox(idx, MEDIA, null)).toBeNull()
  })

  it('asks when going from one shared box to another', () => {
    expect(leavesSharedBox(index([MEDIA, GEAR]), WATCHLIST, GEAR)?.id).toBe(MEDIA)
  })
})
