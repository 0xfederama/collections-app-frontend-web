import { describe, expect, it } from 'vitest'
import type { Folder } from '../api'
import { peopleWithAccess } from './people'
import { folderRights } from './rights'

const ME = 'me'
const OTHER = 'other'

const folder = (patch: Partial<Folder>): Folder => ({
  id: 'f',
  parent_folder_id: null,
  name: 'F',
  sort_order: 0,
  version: 1,
  created_at: '',
  updated_at: '',
  owner_user_id: ME,
  shared: false,
  member_user_ids: [],
  created_by_user_id: ME,
  updated_by_user_id: ME,
  ...patch,
})

describe('F-027 W3 folderRights', () => {
  it.each([
    [
      'my private top-level folder',
      folder({}),
      ME,
      { canShare: true, canLeave: false, canMove: true, canDelete: true },
    ],
    [
      'my shared top-level folder',
      folder({ shared: true, member_user_ids: [OTHER] }),
      ME,
      { canShare: true, canLeave: false, canMove: false, canDelete: true },
    ],
    [
      'a top-level folder shared with me',
      folder({ owner_user_id: OTHER, shared: true, member_user_ids: [ME] }),
      ME,
      { canShare: false, canLeave: true, canMove: false, canDelete: false },
    ],
    [
      'a nested folder',
      folder({ parent_folder_id: 'p', owner_user_id: null }),
      ME,
      { canShare: false, canLeave: false, canMove: true, canDelete: true },
    ],
    [
      'a top-level folder while me is unknown',
      folder({ owner_user_id: OTHER }),
      undefined,
      { canShare: false, canLeave: false, canMove: true, canDelete: true },
    ],
  ])('%s', (_name, f, meId, expected) => {
    expect(folderRights(f, meId)).toEqual(expected)
  })
})

describe('F-027 W3 peopleWithAccess', () => {
  const users = [
    { id: ME, email: 'me@x.test', name: 'Me', avatar_url: null },
    { id: OTHER, email: 'o@x.test', name: null, avatar_url: null },
  ]
  it('lists the owner first, resolves labels and falls back to Unknown person', () => {
    const people = peopleWithAccess(folder({ member_user_ids: [OTHER, 'ghost'] }), users)
    expect(people.map((p) => [p.label, p.isOwner])).toEqual([
      ['Me', true],
      ['o@x.test', false],
      ['Unknown person', false],
    ])
  })
})
