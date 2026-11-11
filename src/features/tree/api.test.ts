import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../mocks/fixtures'
import { OWNER_USER_ID } from '../../mocks/users'
import { buildTree, createTreeIndex, type Folder, type FolderNode, type List } from './api'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const stamp = '2026-10-14T09:00:00Z'

function folder(n: number, parent: number | null, sort_order = 0, name = `F${n}`): Folder {
  return {
    id: id(n),
    parent_folder_id: parent === null ? null : id(parent),
    name,
    sort_order,
    version: 1,
    created_at: stamp,
    updated_at: stamp,
    owner_user_id: parent === null ? OWNER_USER_ID : null,
    shared: false,
    member_user_ids: [],
    created_by_user_id: null,
    updated_by_user_id: null,
  }
}

function list(n: number, parent: number | null, sort_order = 0, name = `L${n}`): List {
  return {
    id: id(n),
    folder_id: parent === null ? null : id(parent),
    name,
    type: null,
    description: null,
    display_mode: 'grid',
    sort_mode: 'manual',
    icon: null,
    icon_color: null,
    sort_order,
    item_count: 0,
    version: 1,
    created_at: stamp,
    updated_at: stamp,
    owner_user_id: parent === null ? OWNER_USER_ID : null,
    created_by_user_id: null,
    updated_by_user_id: null,
  }
}

const ids = (nodes: { id: string }[]) => nodes.map((n) => n.id)

describe('W-04 buildTree', () => {
  it('returns an empty tree for no data', () => {
    expect(buildTree([], [])).toEqual([])
  })

  it('puts sub-folders before lists at the root, never interleaving the order spaces', () => {
    const nodes = buildTree([folder(1, null, 5), folder(2, null, 9)], [list(10, null, 0)])
    expect(ids(nodes)).toEqual([id(1), id(2), id(10)])
    expect(nodes.map((n) => n.kind)).toEqual(['folder', 'folder', 'list'])
  })

  it('puts sub-folders before lists inside a folder', () => {
    const nodes = buildTree([folder(1, null), folder(2, 1, 7)], [list(10, 1, 0), list(11, 1, 1)])
    const root = nodes[0] as FolderNode
    expect(ids(root.children)).toEqual([id(2), id(10), id(11)])
  })

  it('orders each group by sort_order regardless of input order', () => {
    const nodes = buildTree(
      [folder(3, null, 2), folder(1, null, 0), folder(2, null, 1)],
      [list(12, null, 2), list(10, null, 0), list(11, null, 1)],
    )
    expect(ids(nodes)).toEqual([id(1), id(2), id(3), id(10), id(11), id(12)])
  })

  it('breaks sort_order ties by id', () => {
    const nodes = buildTree(
      [folder(3, null, 1), folder(1, null, 1), folder(2, null, 1)],
      [list(22, null, 4), list(20, null, 4), list(21, null, 4)],
    )
    expect(ids(nodes)).toEqual([id(1), id(2), id(3), id(20), id(21), id(22)])
  })

  it('ties are resolved by id, not by input order', () => {
    const a = buildTree([folder(2, null, 0), folder(1, null, 0)], [])
    const b = buildTree([folder(1, null, 0), folder(2, null, 0)], [])
    expect(ids(a)).toEqual(ids(b))
    expect(ids(a)).toEqual([id(1), id(2)])
  })

  it('nests by parent_folder_id and folder_id over several levels', () => {
    const nodes = buildTree([folder(1, null), folder(2, 1), folder(3, 2)], [list(10, 3)])
    const l1 = nodes[0] as FolderNode
    const l2 = l1.children[0] as FolderNode
    const l3 = l2.children[0] as FolderNode
    expect(l1.id).toBe(id(1))
    expect(l2.id).toBe(id(2))
    expect(l3.id).toBe(id(3))
    expect(ids(l3.children)).toEqual([id(10)])
    expect(l3.children[0]!.kind).toBe('list')
  })

  it('keeps root-level lists at the root', () => {
    const nodes = buildTree([], [list(10, null), list(11, null)])
    expect(ids(nodes)).toEqual([id(10), id(11)])
  })

  it('drops folders and lists whose parent is missing', () => {
    const nodes = buildTree([folder(1, null), folder(2, 99)], [list(10, 1), list(11, 98)])
    expect(ids(nodes)).toEqual([id(1)])
    expect(ids((nodes[0] as FolderNode).children)).toEqual([id(10)])
  })

  it('drops the whole subtree under a missing parent', () => {
    const nodes = buildTree([folder(2, 99), folder(3, 2)], [list(10, 3)])
    expect(nodes).toEqual([])
  })

  it('does not hang on a parent cycle', () => {
    const nodes = buildTree([folder(1, 2), folder(2, 1), folder(3, null)], [list(10, 1)])
    expect(ids(nodes)).toEqual([id(3)])
  })

  it('builds the spec example tree', () => {
    const tree = exampleResponses.getTree.body as unknown as { folders: Folder[]; lists: List[] }
    const nodes = buildTree(tree.folders, tree.lists)
    expect(nodes.map((n) => (n.kind === 'folder' ? n.folder.name : n.list.name))).toEqual([
      'Media',
      'Vehicles',
    ])
    const media = nodes[0] as FolderNode
    const movies = media.children[0] as FolderNode
    expect(movies.folder.name).toBe('Movies')
    expect(movies.children.map((n) => n.kind === 'list' && n.list.name)).toEqual(['Watchlist'])
  })
})

describe('W-04 createTreeIndex', () => {
  const data = {
    folders: [folder(1, null), folder(2, 1), folder(3, 2), folder(4, null)],
    lists: [list(10, 3), list(11, null)],
  }

  it('exposes lookups by id and the root nodes', () => {
    const index = createTreeIndex(data)
    expect(index.folders.get(id(2))?.name).toBe('F2')
    expect(index.lists.get(id(10))?.name).toBe('L10')
    expect(ids(index.nodes)).toEqual([id(1), id(4), id(11)])
  })

  it('returns the folders above a list, root first', () => {
    const path = createTreeIndex(data).ancestorsOf(id(10))
    expect(path.map((f) => f.id)).toEqual([id(1), id(2), id(3)])
  })

  it('returns the folders above a folder, root first, without the folder itself', () => {
    const path = createTreeIndex(data).ancestorsOf(id(3))
    expect(path.map((f) => f.id)).toEqual([id(1), id(2)])
  })

  it('returns [] for root-level folders and lists', () => {
    const index = createTreeIndex(data)
    expect(index.ancestorsOf(id(1))).toEqual([])
    expect(index.ancestorsOf(id(11))).toEqual([])
  })

  it('returns [] for an unknown id', () => {
    expect(createTreeIndex(data).ancestorsOf(id(999))).toEqual([])
  })

  it('stops at a missing ancestor', () => {
    const index = createTreeIndex({ folders: [folder(2, 99)], lists: [list(10, 2)] })
    expect(index.ancestorsOf(id(10)).map((f) => f.id)).toEqual([id(2)])
  })

  it('does not hang on a parent cycle', () => {
    const index = createTreeIndex({
      folders: [folder(1, 2), folder(2, 1)],
      lists: [list(10, 1)],
    })
    const path = index.ancestorsOf(id(10))
    expect(path.length).toBeLessThanOrEqual(2)
    expect(index.ancestorsOf(id(1)).length).toBeLessThanOrEqual(2)
  })
})
