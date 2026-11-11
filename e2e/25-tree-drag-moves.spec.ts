import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { createFolder, createList, dragTo, dragToZone, sidebarTree, uniqueName } from './helpers'

// Web 3.1.0 (roadmap 33): every drag the sidebar allows, against the real stack with accounts
// (F-027). The W5 "leaves a shared folder" confirmation and the forbidden drags are covered here too.

const row = (page: Page, name: string) =>
  sidebarTree(page).getByRole('treeitem').filter({ hasText: name })
const topZone = (page: Page) => page.getByText('Move to the top level', { exact: true })

interface TreeJson {
  folders: { id: string; parent_folder_id: string | null; sort_order: number }[]
  lists: { id: string; folder_id: string | null; sort_order: number }[]
}
async function tree(request: APIRequestContext) {
  const response = await request.get('/api/v1/tree')
  expect(response.status(), 'GET tree').toBe(200)
  return (await response.json()) as TreeJson
}
const listParent = async (request: APIRequestContext, id: string) =>
  (await tree(request)).lists.find((l) => l.id === id)?.folder_id
const folderParent = async (request: APIRequestContext, id: string) =>
  (await tree(request)).folders.find((f) => f.id === id)?.parent_folder_id

/** Opens the app tall enough that the rows stay on screen (the helpers cannot scroll mid-drag). */
async function open(page: Page, expand: string[]) {
  await page.setViewportSize({ width: 1440, height: 4000 })
  await page.goto('/')
  for (const name of expand) {
    const r = row(page, name).first()
    await r.scrollIntoViewIfNeeded()
    if ((await r.getAttribute('aria-expanded')) !== 'true') await r.click()
    await expect(r).toHaveAttribute('aria-expanded', 'true')
  }
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

test.describe('web 3.1.0 sidebar drag moves', () => {
  test('a list moves between top-level folders, and out to the top level', async ({
    page,
    request,
  }) => {
    const fromName = uniqueName('From')
    const toName = uniqueName('To')
    const listName = uniqueName('Mover')
    const from = await createFolder(request, fromName)
    const to = await createFolder(request, toName)
    const list = await createList(request, listName, 'movie', from.id)
    await open(page, [fromName])

    await dragTo(page, row(page, listName), row(page, toName), 'into')
    await expect.poll(() => listParent(request, list.id)).toBe(to.id)
    await expect(row(page, listName)).toHaveAttribute('aria-level', '2')

    await dragToZone(page, row(page, listName), topZone(page))
    await expect.poll(() => listParent(request, list.id)).toBeNull()
    await expect(row(page, listName)).toHaveAttribute('aria-level', '1')
    await expect(topZone(page)).toBeHidden()
  })

  test('a folder moves into another folder and back out', async ({ page, request }) => {
    const outerName = uniqueName('Outer box')
    const childName = uniqueName('Child')
    const targetName = uniqueName('Target')
    const outer = await createFolder(request, outerName)
    const child = await createFolder(request, childName, outer.id)
    const target = await createFolder(request, targetName, outer.id)
    await open(page, [outerName])

    await dragTo(page, row(page, childName), row(page, targetName), 'into')
    await expect.poll(() => folderParent(request, child.id)).toBe(target.id)
    await expect(row(page, childName)).toHaveAttribute('aria-level', '3')

    await dragToZone(page, row(page, childName), topZone(page))
    await expect.poll(() => folderParent(request, child.id)).toBeNull()
  })

  test('reorders lists inside a folder', async ({ page, request }) => {
    const boxName = uniqueName('Order box')
    const box = await createFolder(request, boxName)
    const firstName = uniqueName('First')
    const first = await createList(request, firstName, 'movie', box.id)
    const secondName = uniqueName('Second')
    const second = await createList(request, secondName, 'movie', box.id)
    await open(page, [boxName])

    const order = async (ids: string[]) => {
      const t = await tree(request)
      const all = [...t.folders, ...t.lists]
      return ids.map((id) => all.find((n) => n.id === id)?.sort_order ?? -1)
    }
    await dragTo(page, row(page, secondName), row(page, firstName), 'above')
    await expect
      .poll(async () => {
        const [f, s] = await order([first.id, second.id])
        return (s ?? 0) < (f ?? 0)
      })
      .toBe(true)
  })

  test('reorders folders at the top level, and the order stays', async ({ page, request }) => {
    const topA = uniqueName('Top A')
    const topB = uniqueName('Top B')
    await createFolder(request, topA)
    await createFolder(request, topB)
    await open(page, [])
    await dragTo(page, row(page, topB), row(page, topA), 'above')
    // The top level is ordered per user (F-027), not by the folder's own sort_order: read the
    // rendered order, after a reload so it is the server's.
    const topOrder = async () => {
      const [boxA, boxB] = await Promise.all([
        row(page, topA).boundingBox(),
        row(page, topB).boundingBox(),
      ])
      return !!boxA && !!boxB && boxB.y < boxA.y
    }
    await expect.poll(topOrder).toBe(true)
    await page.reload()
    await expect(row(page, topA)).toBeVisible()
    await expect.poll(topOrder).toBe(true)
  })

  test('taking a list out of a shared folder asks first', async ({ page, request }) => {
    const sharedName = uniqueName('Shared')
    const otherName = uniqueName('Mine')
    const shared = await createFolder(request, sharedName)
    await createFolder(request, otherName)
    const listName = uniqueName('Gift')
    const list = await createList(request, listName, 'wishlist', shared.id)
    await shareWithAlice(request, shared.id)
    await open(page, [sharedName])

    await dragTo(page, row(page, listName), row(page, otherName), 'into')
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog'))
    await expect(confirm).toContainText(`Move ‘${listName}’ out of ‘${sharedName}’?`)
    await expect(confirm).toContainText('alice@dev.test')
    await confirm.getByRole('button', { name: 'Cancel' }).click()
    expect(await listParent(request, list.id)).toBe(shared.id)

    await dragToZone(page, row(page, listName), topZone(page))
    await confirm.getByRole('button', { name: 'Move' }).click()
    await expect.poll(() => listParent(request, list.id)).toBeNull()
  })

  test('a shared folder I own cannot be dropped into another folder: nothing is sent', async ({
    page,
    request,
  }) => {
    const sharedName = uniqueName('Shared top')
    const otherName = uniqueName('Elsewhere')
    const shared = await createFolder(request, sharedName)
    await createFolder(request, otherName)
    await shareWithAlice(request, shared.id)
    await open(page, [])
    const moves: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/move')) moves.push(r.url())
    })

    await dragTo(page, row(page, sharedName), row(page, otherName), 'into')
    await expect(row(page, sharedName)).toHaveAttribute('aria-level', '1')
    expect(moves).toEqual([])
    expect(await folderParent(request, shared.id)).toBeNull()
  })
})

// Touch (iPad-size sidebar; phones have no sidebar, F-025): a press-and-hold of 250 ms starts the
// drag. Real touch input through the Chrome DevTools Protocol, so dnd-kit sees pointerType "touch".
test.describe('web 3.1.0 sidebar drag moves, touch', () => {
  test.use({ hasTouch: true, isMobile: false, viewport: { width: 1024, height: 1366 } })

  async function touchDrag(
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: string, points: { x: number; y: number }[]) =>
      cdp.send('Input.dispatchTouchEvent', {
        type: type as 'touchStart',
        touchPoints: points.map((p) => ({ ...p, id: 1 })),
      })
    await touch('touchStart', [from])
    await page.waitForTimeout(400)
    for (let i = 1; i <= 20; i++)
      await touch('touchMove', [
        { x: from.x + ((to.x - from.x) * i) / 20, y: from.y + ((to.y - from.y) * i) / 20 },
      ])
    await touch('touchEnd', [])
  }
  const middle = async (locator: ReturnType<typeof row>) => {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('no box')
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  test('a list moves into a folder with a press-and-hold drag', async ({ page, request }) => {
    const fromName = uniqueName('Touch from')
    const toName = uniqueName('Touch to')
    const listName = uniqueName('Touch list')
    const from = await createFolder(request, fromName)
    const to = await createFolder(request, toName)
    const list = await createList(request, listName, 'movie', from.id)
    await page.goto('/')
    for (const name of [fromName]) {
      await row(page, name).scrollIntoViewIfNeeded()
      await row(page, name).click()
    }
    await expect(row(page, listName)).toBeVisible()
    const target = await middle(row(page, toName))
    await touchDrag(page, await middle(row(page, listName)), target)
    await expect.poll(() => listParent(request, list.id)).toBe(to.id)
  })
})
