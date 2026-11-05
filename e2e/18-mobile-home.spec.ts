import { expect, test } from '@playwright/test'
import { createItem, createList, itemUrl, uniqueName } from './helpers'

// F-025 W12-W14: phone Home as the root, back controls, the view switcher, no auto-open on create.
// Runs only in the `mobile-webkit` project.

test.describe('F-025 mobile Home', () => {
  test('W14 Home shows Quick add, search field, lists, recents, Settings and Trash', async ({
    page,
    request,
  }) => {
    const name = uniqueName('Home list')
    const title = uniqueName('Recent film')
    const list = await createList(request, name, 'movie')
    await createItem(request, list.id, title)
    await page.goto('/')
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { name: 'Recently updated' })).toBeVisible()
    await expect(main.getByRole('link', { name: new RegExp(title) }).first()).toBeVisible()
    await expect(main.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
    await expect(main.getByRole('link', { name: 'Settings' })).toBeVisible()
    await expect(main.getByRole('link', { name: 'Trash' })).toBeVisible()
    await expect(main.getByRole('searchbox', { name: 'Search', exact: true })).toBeVisible()
    const quickAdd = main.getByRole('button', { name: 'Quick add' })
    await expect(quickAdd).toContainText('Quick add')
    // Quick add sits just below the search field.
    const searchBox = await main
      .getByRole('searchbox', { name: 'Search', exact: true })
      .boundingBox()
    const quickBox = await quickAdd.boundingBox()
    expect(quickBox?.y ?? 0).toBeGreaterThan((searchBox?.y ?? 0) + (searchBox?.height ?? 0) - 1)
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
  })

  test('W14 the list has a Back to Home button, the item page goes back to its list', async ({
    page,
    request,
  }) => {
    const name = uniqueName('Nav list')
    const title = uniqueName('Nav film')
    const list = await createList(request, name, 'movie')
    const item = await createItem(request, list.id, title)
    await page.goto('/')
    const main = page.getByRole('main')
    await main
      .getByRole('tree')
      .getByRole('link', { name: new RegExp(name) })
      .tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))

    await expect(main.getByRole('button', { name: 'Back to Home' })).toBeVisible()

    await page.getByRole('link', { name: title }).tap()
    await expect(page).toHaveURL(new RegExp(`${itemUrl(list.id, item.id)}$`))
    await main.getByRole('link', { name: /^Back to / }).tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))
  })

  test('W14 the Home search field opens the results for the query', async ({ page, request }) => {
    const title = uniqueName('Findable')
    const list = await createList(request, uniqueName('Search list'), 'movie')
    await createItem(request, list.id, title)
    await page.goto('/')
    const field = page.getByRole('main').getByRole('searchbox', { name: 'Search', exact: true })
    await field.fill(title)
    await field.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=/)
  })

  test('W12 the View options button leads the toolbar at the height of Filter', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Modes'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)
    const first = main.getByRole('button', { name: 'View options' })
    const filter = main.getByRole('button', { name: 'Filter' })
    const [a, f] = [await first.boundingBox(), await filter.boundingBox()]
    if (!a || !f) throw new Error('missing box')
    expect(Math.abs(a.height - f.height)).toBeLessThanOrEqual(1)
    expect(a.x).toBeLessThan(f.x)
    const search = await main
      .getByRole('searchbox', { name: /Search items by title/ })
      .boundingBox()
    if (!search) throw new Error('missing box')
    expect(a.x).toBeLessThan(search.x)
  })

  test('W13 New item keeps the phone on the list and the toast opens the item', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Create'), 'wishlist')
    const title = uniqueName('Fresh')
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await main.getByRole('button', { name: 'New item' }).tap()
    const field = page.getByRole('textbox', { name: 'Title' })
    await field.fill(title)
    await field.press('Enter')

    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))
    const toast = page.getByText(/^Added/)
    await expect(toast).toBeVisible()
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toContainText(
      title,
    )
    await page.getByRole('button', { name: 'Open', exact: true }).tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/items/[^/]+$`))
  })

  test('W14 opening an item starts at the top, going back restores the list scroll', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Long'), 'wishlist')
    const names: string[] = []
    for (let n = 0; n < 30; n++) names.push(uniqueName(`Row ${String(n).padStart(2, '0')}`))
    const created: { id: string }[] = []
    for (const name of names) created.push(await createItem(request, list.id, name))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(30)
    await page.evaluate(() => window.scrollTo(0, 600))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    const before = await page.evaluate(() => window.scrollY)
    // Open whichever row is in view.
    const visible = await page.evaluate(() => {
      const links = [...document.querySelectorAll<HTMLAnchorElement>('main a[href*="/items/"]')]
      const hit = links.find((a) => {
        const r = a.getBoundingClientRect()
        return r.top > 80 && r.bottom < window.innerHeight - 80
      })
      return hit?.getAttribute('href') ?? null
    })
    if (!visible) throw new Error('no visible item link')
    await page.locator(`main a[href="${visible}"]`).first().tap()
    await expect(page).toHaveURL(new RegExp(`${visible}$`))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - before))
      .toBeLessThan(60)
    expect(created).toHaveLength(30)
  })
})

test.describe('F-025 list row polish', () => {
  for (const mode of ['Compact rows', 'Thumbnail rows'] as const) {
    test(`${mode}: tile strips share one right edge and show at most 4 tiles`, async ({
      page,
      request,
    }) => {
      const list = await createList(request, uniqueName('Strip edge'), 'movie')
      const many = uniqueName('Many services')
      const few = uniqueName('Few services')
      await createItem(request, list.id, many, {
        metadata: {
          streaming: {
            country: 'IT',
            platforms: [
              'Netflix',
              'Disney+',
              'Prime Video',
              'Hulu',
              'Max',
              'Apple TV+',
              'Paramount+',
              'Peacock',
            ],
          },
        },
      })
      await createItem(request, list.id, few, {
        metadata: { streaming: { country: 'IT', platforms: ['Netflix', 'Hulu'] } },
      })
      await page.goto(`/lists/${list.id}`)
      const main = page.getByRole('main')
      await main.getByRole('button', { name: 'View options' }).click()
      await page.getByRole('menuitemradio', { name: mode }).click()
      const rows = main.getByRole('list', { name: 'Items' }).getByRole('listitem')
      await expect(rows).toHaveCount(2)
      const measured: { right: number; tiles: number }[] = []
      for (const row of await rows.all()) {
        const strip = row.locator('span.ml-auto').first()
        await expect(strip).toBeVisible()
        const box = await strip.boundingBox()
        const tiles = await strip.locator(':scope > span.absolute > *').count()
        measured.push({ right: (box?.x ?? 0) + (box?.width ?? 0), tiles })
      }
      for (const { tiles } of measured) expect(tiles).toBeLessThanOrEqual(4)
      expect(Math.max(...measured.map((m) => m.tiles))).toBe(4)
      expect(Math.abs((measured[0]?.right ?? 0) - (measured[1]?.right ?? 1))).toBeLessThanOrEqual(1)
    })
  }

  test('Home, list, item, back to the list: Back to Home lands on /', async ({ page, request }) => {
    const name = uniqueName('Back list')
    const title = uniqueName('Back film')
    const list = await createList(request, name, 'movie')
    const item = await createItem(request, list.id, title)
    await page.goto('/')
    const main = page.getByRole('main')
    await main
      .getByRole('tree')
      .getByRole('link', { name: new RegExp(name) })
      .tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))
    await page.getByRole('link', { name: title }).tap()
    await expect(page).toHaveURL(new RegExp(`${itemUrl(list.id, item.id)}$`))
    await main.getByRole('link', { name: /^Back to / }).tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))
    await main.getByRole('button', { name: 'Back to Home' }).tap()
    await expect(page).toHaveURL(/\/$/)
    await expect(main.getByRole('searchbox', { name: 'Search', exact: true })).toBeVisible()
  })

  test('W5 a list opened from Home: Back to Home goes back in history, no new entry', async ({
    page,
    request,
  }) => {
    const name = uniqueName('History list')
    await createList(request, name, 'movie')
    await page.goto('/')
    const main = page.getByRole('main')
    await main
      .getByRole('tree')
      .getByRole('link', { name: new RegExp(name) })
      .tap()
    await expect(page).toHaveURL(/\/lists\/[^/]+$/)
    const entries = await page.evaluate(() => history.length)
    await main.getByRole('button', { name: 'Back to Home' }).tap()
    await expect(page).toHaveURL(/\/$/)
    expect(await page.evaluate(() => history.length)).toBe(entries)
  })

  test('phone Home: Quick add is as wide as the search field', async ({ page, request }) => {
    await createList(request, uniqueName('Width list'), 'movie')
    await page.goto('/')
    const main = page.getByRole('main')
    const search = await main.getByRole('searchbox', { name: 'Search', exact: true }).boundingBox()
    const quick = await main.getByRole('button', { name: 'Quick add' }).boundingBox()
    expect(Math.abs((quick?.width ?? 0) - (search?.width ?? 1))).toBeLessThanOrEqual(1)
    expect(Math.abs((quick?.x ?? 0) - (search?.x ?? 1))).toBeLessThanOrEqual(1)
  })
})
