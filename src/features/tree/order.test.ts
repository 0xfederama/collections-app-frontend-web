import { describe, expect, it } from 'vitest'
import { arrayMove } from '../../components/ui/sortable'
import { devTree } from '../../mocks/devData'
import { createTreeIndex, type TreeNode } from './api'
import {
  applyOrder,
  buildSortable,
  flattenFolders,
  groupKey,
  parentIdOf,
  subtreeCounts,
} from './order'

const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
const index = createTreeIndex(devTree)
const node = (n: number) => {
  const find = (nodes: readonly TreeNode[]): TreeNode | undefined => {
    for (const candidate of nodes) {
      if (candidate.id === id(n)) return candidate
      if (candidate.kind === 'folder') {
        const found = find(candidate.children)
        if (found) return found
      }
    }
  }
  return find(index.nodes)!
}

describe('AT-03 order helpers: buildSortable', () => {
  const { groups, slots } = buildSortable(index.nodes)

  it('groups folders and lists separately per parent, in display order', () => {
    expect(groups.get(groupKey('folder', null))).toEqual({
      kind: 'folder',
      parentId: null,
      ids: [id(1), id(5), id(6), id(7)],
    })
    expect(groups.get(groupKey('list', null))).toEqual({
      kind: 'list',
      parentId: null,
      ids: [id(18), id(19)],
    })
    expect(groups.get(groupKey('folder', id(1)))?.ids).toEqual([id(2), id(4)])
    expect(groups.get(groupKey('list', id(2)))?.ids).toEqual([id(11), id(12)])
  })

  it('creates a group, possibly empty, for every folder', () => {
    expect(groups.get(groupKey('folder', id(7)))?.ids).toEqual([])
    expect(groups.get(groupKey('list', id(7)))?.ids).toEqual([])
    // 2 kinds x (root + 7 folders)
    expect(groups.size).toBe(16)
  })

  it('gives each node its slot: group, index in its kind, size and label', () => {
    expect(slots.get(id(5))).toEqual({
      group: 'folder:root',
      index: 1,
      size: 4,
      label: 'Vehicles',
    })
    expect(slots.get(id(19))).toEqual({ group: 'list:root', index: 1, size: 2, label: 'Ideas' })
    expect(slots.get(id(12))).toMatchObject({ group: `list:${id(2)}`, index: 1, size: 2 })
    expect(slots.get(id(3))).toMatchObject({ index: 0, size: 1 })
  })

  it('has a slot for every folder and list', () => {
    expect(slots.size).toBe(devTree.folders.length + devTree.lists.length)
  })

  it('handles an empty tree', () => {
    const empty = buildSortable([])
    expect(empty.slots.size).toBe(0)
    expect(empty.groups.get('folder:root')?.ids).toEqual([])
  })
})

describe('AT-03 order helpers: applyOrder', () => {
  it('renumbers the given folders 0..n-1 in the given order and leaves the rest untouched', () => {
    const next = applyOrder(devTree, 'folder', [id(6), id(1), id(7), id(5)])
    const order = (folderId: number) => next.folders.find((f) => f.id === id(folderId))!.sort_order
    expect([order(6), order(1), order(7), order(5)]).toEqual([0, 1, 2, 3])
    // Other folders and all lists keep their values.
    expect(order(2)).toBe(0)
    expect(order(4)).toBe(1)
    expect(next.lists).toBe(devTree.lists)
  })

  it('renumbers lists only for the given ids', () => {
    const next = applyOrder(devTree, 'list', [id(12), id(11)])
    expect(next.lists.find((l) => l.id === id(12))?.sort_order).toBe(0)
    expect(next.lists.find((l) => l.id === id(11))?.sort_order).toBe(1)
    expect(next.lists.find((l) => l.id === id(18))?.sort_order).toBe(0)
    expect(next.folders).toBe(devTree.folders)
  })

  it('does not mutate its input and changes the display order of the rebuilt tree', () => {
    const snapshot = structuredClone(devTree)
    const next = applyOrder(devTree, 'folder', [id(5), id(1), id(6), id(7)])
    expect(devTree).toEqual(snapshot)
    const roots = createTreeIndex(next)
      .nodes.filter((n) => n.kind === 'folder')
      .map((n) => n.id)
    expect(roots).toEqual([id(5), id(1), id(6), id(7)])
  })

  it('ignores ids that are not in the tree', () => {
    const next = applyOrder(devTree, 'list', [id(999), id(12), id(11)])
    expect(next.lists.find((l) => l.id === id(12))?.sort_order).toBe(1)
    expect(next.lists.find((l) => l.id === id(11))?.sort_order).toBe(2)
  })
})

describe('AT-03 order helpers: subtreeCounts', () => {
  it('counts the folder itself plus nested folders, lists and items', () => {
    expect(subtreeCounts(node(1))).toEqual({ folders: 4, lists: 4, items: 72 })
    expect(subtreeCounts(node(2))).toEqual({ folders: 2, lists: 3, items: 69 })
  })

  it('is just the folder itself for an empty folder', () => {
    expect(subtreeCounts(node(7))).toEqual({ folders: 1, lists: 0, items: 0 })
  })

  it('counts a list as itself plus its items', () => {
    expect(subtreeCounts(node(15))).toEqual({ folders: 0, lists: 1, items: 7 })
    expect(subtreeCounts(node(19))).toEqual({ folders: 0, lists: 1, items: 0 })
  })
})

describe('AT-03 order helpers: small helpers', () => {
  it('parentIdOf gives the parent folder id, null at the root', () => {
    expect(parentIdOf(node(1))).toBeNull()
    expect(parentIdOf(node(3))).toBe(id(2))
    expect(parentIdOf(node(18))).toBeNull()
    expect(parentIdOf(node(13))).toBe(id(3))
  })

  it('groupKey names the root as "root"', () => {
    expect(groupKey('folder', null)).toBe('folder:root')
    expect(groupKey('list', 'abc')).toBe('list:abc')
  })

  it('flattenFolders lists every folder in display order with its depth', () => {
    expect(flattenFolders(index).map((x) => [x.folder.name, x.depth])).toEqual([
      ['Media', 0],
      ['Movies', 1],
      ['Festival picks', 2],
      ['TV', 1],
      ['Vehicles', 0],
      ['Gear', 0],
      ['Empty folder', 0],
    ])
  })
})

describe('AT-21 arrayMove', () => {
  it('moves an item forward and backward', () => {
    expect(arrayMove(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(arrayMove(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('is the identity when from equals to', () => {
    expect(arrayMove(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })

  it('moves to the ends', () => {
    expect(arrayMove([1, 2, 3], 0, 2)).toEqual([2, 3, 1])
    expect(arrayMove([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
  })

  it('does not mutate its input', () => {
    const input = ['a', 'b', 'c']
    arrayMove(input, 0, 2)
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('leaves the array unchanged for an out-of-range source', () => {
    expect(arrayMove(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})
