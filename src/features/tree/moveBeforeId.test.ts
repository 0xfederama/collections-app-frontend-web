import { describe, expect, it } from 'vitest'
import { apiUrl, ID, installTreeBackend } from './treeTestKit'

// The planned `before_id` of the move endpoints (api-v4.2.0), as the dev/test fake honours it.
async function move(
  backend: ReturnType<typeof installTreeBackend>,
  kind: 'folders' | 'lists',
  id: string,
  body: object,
) {
  const node = [...backend.state.folders, ...backend.state.lists].find((n) => n.id === id)!
  const response = await fetch(apiUrl(`/api/v1/${kind}/${id}/move`), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'If-Match': `"${kind[0]}-${node.version}"` },
    body: JSON.stringify(body),
  })
  return response.status
}

const listOrder = (backend: ReturnType<typeof installTreeBackend>, folderId: string | null) =>
  backend.state.lists
    .filter((l) => l.folder_id === folderId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => l.id)
const folderOrder = (backend: ReturnType<typeof installTreeBackend>, parentId: string | null) =>
  backend.state.folders
    .filter((f) => f.parent_folder_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => f.id)

describe('web 3.3.0 move with before_id (fake backend)', () => {
  it('a list lands before the given sibling and the others are renumbered', async () => {
    const backend = installTreeBackend()
    expect(
      await move(backend, 'lists', ID.wishlist, { folder_id: ID.movies, before_id: ID.seen }),
    ).toBe(200)
    expect(listOrder(backend, ID.movies)).toEqual([ID.watchlist, ID.wishlist, ID.seen])
    expect(backend.state.lists.map((l) => l.sort_order).every((n) => Number.isInteger(n))).toBe(
      true,
    )
    expect(listOrder(backend, null)).toEqual([ID.ideas])
  })

  it('null and an absent before_id append last', async () => {
    const backend = installTreeBackend()
    await move(backend, 'lists', ID.wishlist, { folder_id: ID.movies, before_id: null })
    expect(listOrder(backend, ID.movies)).toEqual([ID.watchlist, ID.seen, ID.wishlist])
    await move(backend, 'lists', ID.ideas, { folder_id: ID.movies })
    expect(listOrder(backend, ID.movies)).toEqual([ID.watchlist, ID.seen, ID.wishlist, ID.ideas])
  })

  it('a folder lands before a sibling folder, at the top level too', async () => {
    const backend = installTreeBackend()
    expect(
      await move(backend, 'folders', ID.gear, { parent_folder_id: ID.media, before_id: ID.tv }),
    ).toBe(200)
    expect(folderOrder(backend, ID.media)).toEqual([ID.movies, ID.gear, ID.tv])
    expect(
      await move(backend, 'folders', ID.tv, { parent_folder_id: null, before_id: ID.vehicles }),
    ).toBe(200)
    expect(folderOrder(backend, null)).toEqual([ID.media, ID.tv, ID.vehicles, ID.empty])
  })

  it('422 when before_id is not a same-kind sibling in the destination; nothing changes', async () => {
    const backend = installTreeBackend()
    // A list of another folder, a folder for a list, a list for a folder.
    expect(
      await move(backend, 'lists', ID.wishlist, { folder_id: ID.movies, before_id: ID.cars }),
    ).toBe(422)
    expect(
      await move(backend, 'lists', ID.wishlist, { folder_id: ID.movies, before_id: ID.festival }),
    ).toBe(422)
    expect(
      await move(backend, 'folders', ID.gear, { parent_folder_id: ID.media, before_id: ID.seen }),
    ).toBe(422)
    expect(backend.state.lists.find((l) => l.id === ID.wishlist)?.folder_id).toBeNull()
    expect(backend.state.folders.find((f) => f.id === ID.gear)?.parent_folder_id).toBeNull()
  })
})
