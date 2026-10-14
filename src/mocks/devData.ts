import type { components } from '../generated/schema'
import { createTreeBackend } from './devTree'

type Folder = components['schemas']['Folder']
type List = components['schemas']['List']
type Tree = components['schemas']['Tree']

const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n).padStart(12, '0')}`
const stamp = '2026-10-14T09:00:00Z'

const folder = (n: number, name: string, parent: number | null, sortOrder: number): Folder => ({
  id: id(n),
  parent_folder_id: parent === null ? null : id(parent),
  name,
  sort_order: sortOrder,
  version: 1,
  created_at: stamp,
  updated_at: stamp,
})

const list = (
  n: number,
  name: string,
  parent: number | null,
  sortOrder: number,
  itemCount: number,
): List => ({
  id: id(n),
  folder_id: parent === null ? null : id(parent),
  name,
  description: null,
  display_mode: 'grid',
  sort_mode: 'manual',
  sort_order: sortOrder,
  item_count: itemCount,
  version: 1,
  created_at: stamp,
  updated_at: stamp,
})

/** A richer tree than the spec example (three levels, root lists), for `VITE_API_MOCKS=1 npm run dev`. */
export const devTree: Tree = {
  folders: [
    folder(1, 'Media', null, 0),
    folder(2, 'Movies', 1, 0),
    folder(3, 'Festival picks', 2, 0),
    folder(4, 'TV', 1, 1),
    folder(5, 'Vehicles', null, 1),
    folder(6, 'Gear', null, 2),
    folder(7, 'Empty folder', null, 3),
  ],
  lists: [
    list(11, 'Watchlist', 2, 0, 12),
    list(12, 'Seen', 2, 1, 48),
    list(13, 'Cannes 2026', 3, 0, 9),
    list(14, 'Currently watching', 4, 0, 3),
    list(15, 'Motorbikes', 5, 0, 7),
    list(16, 'Cars', 5, 1, 2),
    list(17, 'Cameras', 6, 0, 5),
    list(18, 'Wishlist', null, 0, 21),
    list(19, 'Ideas', null, 1, 0),
  ],
}

/** Dev worker only: listed before the spec-example handlers, so it wins. Tests keep the spec example. */
const treeBackend = createTreeBackend(devTree)
export const devHandlers = treeBackend.handlers
/** Live folders and lists of the dev tree (devItems reads list records from here, so both share one). */
export const devTreeState = treeBackend.state
