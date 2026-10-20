import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { itemKeys } from '../items'
import { listKeys } from '../lists'
import { searchKeys } from '../search'
import { treeKeys } from '../tree'
import {
  ITEMS_KEY_ROOT,
  LISTS_KEY_ROOT,
  TRASH_PAGE_SIZE,
  trashKeys,
  usePurgeTrash,
  useRestoreTrash,
  useTrash,
} from './api'
import { createTestQueryClient } from '../../test-utils'
import { entry, installTrash, T } from './trashTestKit'

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

describe('AT-11 query key roots', () => {
  it('LISTS_KEY_ROOT and ITEMS_KEY_ROOT follow the real list and item keys', () => {
    expect(LISTS_KEY_ROOT).toBe(listKeys.detail('x')[0])
    expect(LISTS_KEY_ROOT).toBe(listKeys.items('x')[0])
    expect(ITEMS_KEY_ROOT).toBe(itemKeys.detail('x')[0])
    expect(ITEMS_KEY_ROOT).toBe(itemKeys.content('x')[0])
  })

  it('the trash list key sits under trashKeys.all', () => {
    expect(trashKeys.list.slice(0, trashKeys.all.length)).toEqual([...trashKeys.all])
  })
})

describe('AT-11 trash hooks', () => {
  it('useTrash requests the first page by offset and stops at the total', async () => {
    const trash = installTrash([entry(1), entry(2), entry(3)])
    const client = createTestQueryClient()
    const { result } = renderHook(() => useTrash(), { wrapper: wrapperFor(client) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(trash.call('GET', 0).search.get('limit')).toBe(String(TRASH_PAGE_SIZE))
    expect(trash.call('GET', 0).search.get('offset')).toBe('0')
    expect(result.current.hasNextPage).toBe(false)
  })

  it('restore without a destination sends no body; with one it sends { destination }', async () => {
    const trash = installTrash()
    const client = createTestQueryClient()
    const { result } = renderHook(() => useRestoreTrash(), { wrapper: wrapperFor(client) })

    await act(() => result.current.mutateAsync({ batchId: T.crime }))
    await act(() =>
      result.current.mutateAsync({ batchId: T.cameras, destination: { folder_id: null } }),
    )
    const posts = trash.calls('POST')
    expect(posts[0]!.path).toBe(`/api/v1/trash/${T.crime}/restore`)
    expect(posts[0]!.body).toBeUndefined()
    expect(posts[1]!.body).toEqual({ destination: { folder_id: null } })
  })

  it('a successful restore invalidates trash, tree, lists, items and search', async () => {
    installTrash()
    const client = createTestQueryClient()
    const seeds = [
      trashKeys.list,
      treeKeys.tree,
      listKeys.detail('l1'),
      listKeys.items('l1'),
      itemKeys.detail('i1'),
      searchKeys.top('q', 8, 0),
      ['settings'],
    ]
    for (const key of seeds) client.setQueryData(key, { seeded: true })
    const { result } = renderHook(() => useRestoreTrash(), { wrapper: wrapperFor(client) })
    await act(() => result.current.mutateAsync({ batchId: T.crime }))

    for (const key of seeds.slice(0, -1)) {
      expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true)
    }
    // Unrelated caches are left alone.
    expect(client.getQueryState(['settings'])?.isInvalidated).toBe(false)
  })

  it('a successful purge invalidates the same caches', async () => {
    const trash = installTrash()
    const client = createTestQueryClient()
    const seeds = [trashKeys.list, treeKeys.tree, listKeys.items('l1'), itemKeys.detail('i1')]
    for (const key of seeds) client.setQueryData(key, { seeded: true })
    const { result } = renderHook(() => usePurgeTrash(), { wrapper: wrapperFor(client) })
    await act(() => result.current.mutateAsync(T.crime))
    expect(trash.calls('DELETE', `/api/v1/trash/${T.crime}`)).toHaveLength(1)
    for (const key of seeds) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  })
})
