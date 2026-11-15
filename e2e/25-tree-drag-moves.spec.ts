import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import {
  createFolder,
  createList,
  dragHold,
  dragTo,
  dragToEnd,
  sidebarTree,
  touchDragTo,
  uniqueName,
} from './helpers'

// Web 3.3.0 (roadmap 35, D-158): any list or folder can be dragged anywhere in the sidebar tree and
// lands exactly where it is dropped. Needs a fresh stack with accounts (F-027) and a backend that
// takes `before_id` on the move endpoints (api-v4.2.0): the cross-parent cases fail against older
// backends, the reorder and forbidden cases do not need it.

const row = (page: Page, name: string) =>
  sidebarTree(page).getByRole('treeitem').filter({ hasText: name })

interface TreeJson {
  folders: { id: string; parent_folder_id: string | null; sort_order: number }[]
  lists: { id: string; folder_id: string | null; sort_order: number }[]
}
async function tree(request: APIRequestContext) {
  const response = await request.get('/api/v1/tree')
  expect(response.status(), 'GET tree').toBe(200)
  return (await response.json()) as TreeJson
}
/** Ids of the lists (or folders) inside `parentId` (null = top level), by `sort_order`. */
async function order(request: APIRequestContext, kind: 'list' | 'folder', parentId: string | null) {
  const data = await tree(request)
  const nodes =
    kind === 'list'
      ? data.lists.filter((l) => l.folder_id === parentId)
      : data.folders.filter((f) => f.parent_folder_id === parentId)
  return nodes.sort((a, b) => a.sort_order - b.sort_order).map((n) => n.id)
}
const parentOf = async (request: APIRequestContext, id: string) => {
  const data = await tree(request)
  const found = data.folders.find((f) => f.id === id)
  return found ? found.parent_folder_id : (data.lists.find((l) => l.id === id)?.folder_id ?? null)
}
/** The ids of the rows the sidebar shows, top to bottom. */
const shown = (page: Page) =>
  sidebarTree(page)
    .getByRole('treeitem')
    .evaluateAll((rows) => rows.map((r) => r.getAttribute('data-tree-id')))

/** Opens the app tall enough that the rows stay on screen (the helpers cannot scroll mid-drag), folders opened. */
async function open(page: Page, expand: string[]) {
  await page.setViewportSize({ width: 1440, height: 8000 })
  await page.goto('/')
  for (const name of expand) {
    const r = row(page, name).first()
    await r.scrollIntoViewIfNeeded()
    if ((await r.getAttribute('aria-expanded')) !== 'true') await r.click()
    await expect(r).toHaveAttribute('aria-expanded', 'true')
  }
}

/** Collects every move request the page sends. */
function recordMoves(page: Page) {
  const moves: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/move')) moves.push(r.url())
  })
  return moves
}

/** Makes sure Alice has signed in once, so she can be added as a member. */
async function shareWithAlice(request: APIRequestContext, folderId: string) {
  const me = await request.get('/api/v1/me', { headers: { Cookie: 'dev_user=alice@dev.test' } })
  expect(me.status()).toBe(200)
  const added = await request.post(`/api/v1/folders/${folderId}/members`, {
    headers: { Cookie: 'dev_user=owner@dev.test' },
    data: { email: 'alice@dev.test' },
  })
  expect(added.status(), 'add member').toBe(200)
}

async function signInAs(
  context: BrowserContext,
  who: 'owner' | 'alice',
  baseURL: string | undefined,
) {
  const host = new URL(baseURL ?? 'http://localhost:5183').hostname
  await context.addCookies([
    { name: 'dev_user', value: encodeURIComponent(`${who}@dev.test`), domain: host, path: '/' },
  ])
}

test.describe('web 3.3.0 drag anywhere: mouse', () => {
  test('into an open folder, between two children, at that exact place', async ({
    page,
    request,
  }) => {
    const boxName = uniqueName('Open box')
    const box = await createFolder(request, boxName)
    const first = await createList(request, uniqueName('First'), 'movie', box.id)
    const secondName = uniqueName('Second')
    const second = await createList(request, secondName, 'movie', box.id)
    const outsiderName = uniqueName('Outsider')
    const outsider = await createList(request, outsiderName, 'movie')
    await open(page, [boxName])

    await dragTo(page, row(page, outsiderName), row(page, secondName), 'above')
    await expect
      .poll(() => order(request, 'list', box.id))
      .toEqual([first.id, outsider.id, second.id])
    await expect(row(page, outsiderName)).toHaveAttribute('aria-level', '2')
    await page.reload()
    expect(await order(request, 'list', box.id)).toEqual([first.id, outsider.id, second.id])
  })

  test('into a folder by its row: it lands last', async ({ page, request }) => {
    const targetName = uniqueName('Target')
    const target = await createFolder(request, targetName)
    const one = await createList(request, uniqueName('One'), 'movie', target.id)
    const two = await createList(request, uniqueName('Two'), 'movie', target.id)
    const movedName = uniqueName('Moved')
    const moved = await createList(request, movedName, 'movie')
    await open(page, [])

    await dragTo(page, row(page, movedName), row(page, targetName), 'into')
    await expect.poll(() => order(request, 'list', target.id)).toEqual([one.id, two.id, moved.id])
    // The folder opens to show what it received.
    await expect(row(page, movedName)).toHaveAttribute('aria-level', '2')
  })

  test('out to the top level, between two top-level rows', async ({ page, request }) => {
    const topA = await createFolder(request, uniqueName('Top A'))
    const topB = await createFolder(request, uniqueName('Top B'))
    const boxName = uniqueName('Box')
    const box = await createFolder(request, boxName)
    const moverName = uniqueName('Mover')
    const mover = await createFolder(request, moverName, box.id)
    await open(page, [boxName])

    await dragTo(
      page,
      row(page, moverName),
      sidebarTree(page).locator(`[data-tree-id="${topB.id}"]`),
      'above',
    )
    await expect.poll(() => parentOf(request, mover.id)).toBeNull()
    await expect(row(page, moverName)).toHaveAttribute('aria-level', '1')
    // Exactly between the two, and the server keeps that order.
    const between = async () => {
      const ids = (await shown(page)).filter((id) =>
        [topA.id, mover.id, topB.id].includes(id ?? ''),
      )
      return ids.join()
    }
    await expect.poll(between).toBe([topA.id, mover.id, topB.id].join())
    await page.reload()
    await expect.poll(between).toBe([topA.id, mover.id, topB.id].join())
  })

  test('out to the end of the top level, below the last row', async ({ page, request }) => {
    const boxName = uniqueName('End box')
    const box = await createFolder(request, boxName)
    const listName = uniqueName('Leaver')
    const list = await createList(request, listName, 'movie', box.id)
    await open(page, [boxName])

    await dragToEnd(page, row(page, listName))
    await expect.poll(() => parentOf(request, list.id)).toBeNull()
    const all = await order(request, 'list', null)
    expect(all.at(-1)).toBe(list.id)
  })

  test('reorders inside a folder', async ({ page, request }) => {
    const boxName = uniqueName('Order box')
    const box = await createFolder(request, boxName)
    const aName = uniqueName('Aaa')
    const a = await createList(request, aName, 'movie', box.id)
    const b = await createList(request, uniqueName('Bbb'), 'movie', box.id)
    const cName = uniqueName('Ccc')
    const c = await createList(request, cName, 'movie', box.id)
    await open(page, [boxName])

    await dragTo(page, row(page, cName), row(page, aName), 'above')
    await expect.poll(() => order(request, 'list', box.id)).toEqual([c.id, a.id, b.id])
    await page.reload()
    expect(await order(request, 'list', box.id)).toEqual([c.id, a.id, b.id])
  })

  test('a folder into another folder at a position', async ({ page, request }) => {
    const outerName = uniqueName('Outer')
    const outer = await createFolder(request, outerName)
    const moverName = uniqueName('Mover folder')
    const mover = await createFolder(request, moverName, outer.id)
    const targetName = uniqueName('Target folder')
    const target = await createFolder(request, targetName, outer.id)
    const t1 = await createFolder(request, uniqueName('Inner one'), target.id)
    const t2Name = uniqueName('Inner two')
    const t2 = await createFolder(request, t2Name, target.id)
    await open(page, [outerName, targetName])

    await dragTo(page, row(page, moverName), row(page, t2Name), 'above')
    await expect.poll(() => order(request, 'folder', target.id)).toEqual([t1.id, mover.id, t2.id])
    await expect(row(page, moverName)).toHaveAttribute('aria-level', '3')
  })

  test('the insertion line shows the target depth while dragging, and nothing is sent on Escape', async ({
    page,
    request,
  }) => {
    const boxName = uniqueName('Line box')
    const box = await createFolder(request, boxName)
    await createList(request, uniqueName('Kid one'), 'movie', box.id)
    const kidName = uniqueName('Kid two')
    await createList(request, kidName, 'movie', box.id)
    const outsiderName = uniqueName('Line outsider')
    const outsider = await createList(request, outsiderName, 'movie')
    await open(page, [boxName])
    const moves = recordMoves(page)

    await dragHold(page, row(page, outsiderName), row(page, kidName), 'above')
    const line = sidebarTree(page).locator('[data-tree-drop-line]')
    await expect(line).toHaveAttribute('data-tree-drop-level', '2')
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(line).toHaveCount(0)
    expect(moves).toEqual([])
    expect(await parentOf(request, outsider.id)).toBeNull()
  })

  test('forbidden: a folder into its own descendant sends nothing and shows no line', async ({
    page,
    request,
  }) => {
    const outerName = uniqueName('Outer folder')
    const innerName = uniqueName('Inner folder')
    const outer = await createFolder(request, outerName)
    const inner = await createFolder(request, innerName, outer.id)
    await open(page, [outerName])
    const moves = recordMoves(page)

    await dragHold(page, row(page, outerName), row(page, innerName), 'into')
    await expect(sidebarTree(page).locator('[data-tree-drop-line]')).toHaveCount(0)
    await page.mouse.up()
    await expect(row(page, outerName)).toHaveAttribute('aria-level', '1')
    await expect(row(page, innerName)).toHaveAttribute('aria-level', '2')
    expect(moves).toEqual([])
    expect(await parentOf(request, inner.id)).toBe(outer.id)
    expect(await parentOf(request, outer.id)).toBeNull()
  })

  test('forbidden: a shared folder I own cannot go into another folder', async ({
    page,
    request,
  }) => {
    const sharedName = uniqueName('Shared top')
    const otherName = uniqueName('Elsewhere')
    const shared = await createFolder(request, sharedName)
    await createFolder(request, otherName)
    await shareWithAlice(request, shared.id)
    await open(page, [])
    const moves = recordMoves(page)

    await dragTo(page, row(page, sharedName), row(page, otherName), 'into')
    await expect(row(page, sharedName)).toHaveAttribute('aria-level', '1')
    expect(moves).toEqual([])
    expect(await parentOf(request, shared.id)).toBeNull()
  })

  test('taking a list out of a shared folder asks first; Cancel keeps it, Move does it', async ({
    page,
    request,
  }) => {
    const sharedName = uniqueName('Shared')
    const otherName = uniqueName('Mine')
    const shared = await createFolder(request, sharedName)
    const other = await createFolder(request, otherName)
    const listName = uniqueName('Gift')
    const list = await createList(request, listName, 'wishlist', shared.id)
    await shareWithAlice(request, shared.id)
    await open(page, [sharedName])
    const moves = recordMoves(page)

    await dragTo(page, row(page, listName), row(page, otherName), 'above')
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog'))
    await expect(confirm).toContainText(`Move ‘${listName}’ out of ‘${sharedName}’?`)
    await expect(confirm).toContainText('alice@dev.test')
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    expect(moves).toEqual([])
    expect(await parentOf(request, list.id)).toBe(shared.id)

    await dragTo(page, row(page, listName), row(page, otherName), 'above')
    await confirm.getByRole('button', { name: 'Move' }).click()
    await expect.poll(() => parentOf(request, list.id)).toBeNull()
    expect(await parentOf(request, other.id)).toBeNull()
  })
})

// Alice's view: the owner's shared top-level folder is in her tree, and it is not hers to move.
test.describe('web 3.3.0 drag anywhere: someone else’s shared folder', () => {
  test('cannot be dropped into one of my folders: nothing is sent', async ({
    page,
    request,
    context,
    baseURL,
  }) => {
    const sharedName = uniqueName('Owner shared')
    const shared = await createFolder(request, sharedName)
    await shareWithAlice(request, shared.id)
    const mineName = uniqueName('Alice folder')
    const mine = await request.post('/api/v1/folders', {
      headers: { Cookie: 'dev_user=alice@dev.test' },
      data: { name: mineName, parent_folder_id: null },
    })
    expect(mine.status()).toBe(201)

    await signInAs(context, 'alice', baseURL)
    await open(page, [])
    const moves = recordMoves(page)
    await dragTo(page, row(page, sharedName), row(page, mineName), 'into')
    await expect(row(page, sharedName)).toHaveAttribute('aria-level', '1')
    expect(moves).toEqual([])
    expect(await parentOf(request, shared.id)).toBeNull()
  })
})

// Touch (iPad-size sidebar; phones have no sidebar, F-025): a press-and-hold of 250 ms starts the drag.
test.describe('web 3.3.0 drag anywhere: touch', () => {
  test.use({ hasTouch: true, isMobile: false, viewport: { width: 1024, height: 8000 } })
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'the touch drag uses Chrome DevTools Protocol touch input; WebKit has no CDP, the mobile-webkit project covers phones',
  )

  test('a list moves into an open folder between its children', async ({ page, request }) => {
    const boxName = uniqueName('Touch box')
    const box = await createFolder(request, boxName)
    const first = await createList(request, uniqueName('Touch one'), 'movie', box.id)
    const secondName = uniqueName('Touch two')
    const second = await createList(request, secondName, 'movie', box.id)
    const outsiderName = uniqueName('Touch outsider')
    const outsider = await createList(request, outsiderName, 'movie')
    await page.goto('/')
    await row(page, boxName).scrollIntoViewIfNeeded()
    await row(page, boxName).click()
    await expect(row(page, secondName)).toBeVisible()

    await touchDragTo(page, row(page, outsiderName), row(page, secondName), 'above')
    await expect
      .poll(() => order(request, 'list', box.id))
      .toEqual([first.id, outsider.id, second.id])
  })

  test('a list moves into a folder by its row', async ({ page, request }) => {
    const fromName = uniqueName('Touch from')
    const toName = uniqueName('Touch to')
    const listName = uniqueName('Touch list')
    const from = await createFolder(request, fromName)
    const to = await createFolder(request, toName)
    const list = await createList(request, listName, 'movie', from.id)
    await page.goto('/')
    await row(page, fromName).scrollIntoViewIfNeeded()
    await row(page, fromName).click()
    await expect(row(page, listName)).toBeVisible()

    await touchDragTo(page, row(page, listName), row(page, toName), 'into')
    await expect.poll(() => parentOf(request, list.id)).toBe(to.id)
  })
})
