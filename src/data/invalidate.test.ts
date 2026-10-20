import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { invalidateContent, invalidateItemWrite } from './invalidate'
import { homeKeys, listKeys, searchKeys, settingsKeys, trashKeys, treeKeys } from './keys'

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
  const client = new QueryClient()
  for (const key of seeds) client.setQueryData(key, { seeded: true })
  client.setQueryData(settingsKeys.settings, { seeded: true })
  return client
}

describe('F006-W1 invalidateContent', () => {
  it('invalidates tree, lists, items, search, Home recent and trash, nothing else', async () => {
    const client = seeded()
    await invalidateContent(client)
    for (const key of seeds) {
      expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true)
    }
    expect(client.getQueryState(settingsKeys.settings)?.isInvalidated).toBe(false)
  })
})

describe('F020-W4 invalidateItemWrite', () => {
  it('invalidates exactly the item list, its detail, the tree, search and Home recent', async () => {
    const client = new QueryClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    await invalidateItemWrite(client, 'l1')
    expect(spy.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      listKeys.items('l1'),
      listKeys.detail('l1'),
      treeKeys.tree,
      searchKeys.all,
      homeKeys.recent,
    ])
  })

  it('leaves the trash and other lists alone', async () => {
    const client = seeded()
    client.setQueryData(listKeys.items('l2'), { seeded: true })
    await invalidateItemWrite(client, 'l1')
    expect(client.getQueryState(trashKeys.list)?.isInvalidated).toBe(false)
    expect(client.getQueryState(listKeys.items('l2'))?.isInvalidated).toBe(false)
    expect(client.getQueryState(listKeys.items('l1'))?.isInvalidated).toBe(true)
  })
})
