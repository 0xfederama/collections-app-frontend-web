import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../generated/examples'
import { server } from '../mocks/server'
import { createTestQueryClient } from '../test-utils'
import { homeKeys } from './home/api'
import { invalidateContent } from './invalidateContent'
import { useCreateItem, useDeleteItem, useMoveItem, type Item } from './items/api'
import { listKeys } from './lists/api'
import { searchKeys } from './search/api'
import { trashKeys } from './trash/keys'
import { useRestoreTrash, usePurgeTrash } from './trash/api'
import {
  useCreateFolder,
  useDeleteFolder,
  useDeleteList,
  useMoveList,
  treeKeys,
  type Folder,
  type List,
} from './tree'

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)

const item = exampleResponses.getItem.body as Item
const folder = { id: 'f1', version: 1 } as Folder
const list = { id: 'l1', version: 1 } as List
const noContent = () => new HttpResponse(null, { status: 204 })
const base = location.origin

const seeds = [
  treeKeys.tree,
  listKeys.items('l1'),
  listKeys.detail('l1'),
  ['items', 'i1', 'detail'],
  searchKeys.top('q', 8, 0),
  homeKeys.recent,
  trashKeys.list,
]

function seeded() {
  const client = createTestQueryClient()
  for (const key of seeds) client.setQueryData(key, { seeded: true })
  client.setQueryData(['settings'], { seeded: true })
  return client
}

function expectInvalidated(client: QueryClient) {
  for (const key of seeds) {
    expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true)
  }
  expect(client.getQueryState(['settings'])?.isInvalidated).toBe(false)
}

async function run<T>(
  client: QueryClient,
  useHook: () => T,
  call: (mutation: T) => Promise<unknown>,
) {
  const { result } = renderHook(useHook, { wrapper: wrapperFor(client) })
  await act(() => call(result.current))
}

describe('F006-W1 invalidateContent', () => {
  it('invalidates tree, lists, items, search, Home recent and trash, nothing else', async () => {
    const client = seeded()
    await invalidateContent(client)
    expectInvalidated(client)
  })

  const cases: [string, (client: QueryClient) => Promise<unknown>][] = [
    ['delete folder', (c) => run(c, useDeleteFolder, (m) => m.mutateAsync(folder))],
    ['delete list', (c) => run(c, useDeleteList, (m) => m.mutateAsync(list))],
    ['move list', (c) => run(c, useMoveList, (m) => m.mutateAsync({ list, folderId: null }))],
    [
      'create folder',
      (c) => run(c, useCreateFolder, (m) => m.mutateAsync({ name: 'x', parentId: null })),
    ],
    ['delete item', (c) => run(c, useDeleteItem, (m) => m.mutateAsync({ item }))],
    ['move item', (c) => run(c, useMoveItem, (m) => m.mutateAsync({ item, listId: 'l2' }))],
    [
      'create item',
      (c) =>
        run(
          c,
          () => useCreateItem('l1'),
          (m) => m.mutateAsync({ type: 'movie', title: 'T' } as never),
        ),
    ],
    ['restore', (c) => run(c, useRestoreTrash, (m) => m.mutateAsync({ batchId: 'b1' }))],
    ['purge', (c) => run(c, usePurgeTrash, (m) => m.mutateAsync('b1'))],
  ]

  it.each(cases)('%s refreshes every content screen (trash and Home included)', async (_n, go) => {
    server.use(
      http.delete(`${base}/api/v1/folders/:id`, noContent),
      http.delete(`${base}/api/v1/lists/:id`, noContent),
      http.delete(`${base}/api/v1/items/:id`, noContent),
      http.delete(`${base}/api/v1/trash/:id`, noContent),
    )
    const client = seeded()
    await go(client)
    expectInvalidated(client)
  })
})
