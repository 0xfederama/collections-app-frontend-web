import { describe, expect, it } from 'vitest'
import { devTree } from '../../mocks/devData'
import { createTreeIndex, type TreeNode } from './api'
import { findNode, isOpenWithin, nameOf } from './treeLookup'

const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
const index = createTreeIndex(devTree)

/** Every node of the dev tree, nested ones included, to check `nameOf` against the data. */
const allNodes = (nodes: readonly TreeNode[]): TreeNode[] =>
  nodes.flatMap((node) => (node.kind === 'folder' ? [node, ...allNodes(node.children)] : [node]))

describe('tree lookup: findNode', () => {
  it.each([
    ['a folder at the root', 1, 'folder'],
    ['a list at the root', 18, 'list'],
    ['a folder nested two levels down', 3, 'folder'],
    ['a list nested inside a folder', 11, 'list'],
    ['a list nested three levels down', 13, 'list'],
  ])('finds %s', (_label, n, kind) => {
    const found = findNode(index.nodes, id(n))
    expect(found?.id).toBe(id(n))
    expect(found?.kind).toBe(kind)
  })

  it.each([
    ['an id that is not in the tree', 'not-a-real-id'],
    ['an id that only looks like a node', id(999)],
  ])('returns undefined for %s', (_label, missing) => {
    expect(findNode(index.nodes, missing)).toBeUndefined()
  })

  it('returns undefined for an empty tree', () => {
    expect(findNode([], id(1))).toBeUndefined()
  })
})

describe('tree lookup: nameOf', () => {
  it.each(allNodes(index.nodes).map((node) => [node.kind, node] as const))(
    'names a %s by its own name field',
    (_kind, node) => {
      const expected =
        node.kind === 'folder'
          ? devTree.folders.find((f) => f.id === node.id)?.name
          : devTree.lists.find((l) => l.id === node.id)?.name
      expect(nameOf(node)).toBe(expected)
    },
  )

  it('reads the list name, not the folder name, for a list', () => {
    const list = findNode(index.nodes, id(18))!
    expect(list.kind).toBe('list')
    expect(nameOf(list)).toBe('Wishlist')
  })

  it('reads the folder name for a folder', () => {
    const folder = findNode(index.nodes, id(1))!
    expect(folder.kind).toBe('folder')
    expect(nameOf(folder)).toBe('Media')
  })
})

describe('tree lookup: isOpenWithin', () => {
  it.each([
    ['the open list is the folder itself', id(1), id(1), true],
    ['the open list sits inside the folder', id(13), id(1), true],
    ['the open list is in a different branch', id(15), id(3), false],
    ['no list is open', null, id(1), false],
  ])('%s', (_label, activeListId, folderId, expected) => {
    expect(isOpenWithin(index, activeListId, folderId)).toBe(expected)
  })
})
