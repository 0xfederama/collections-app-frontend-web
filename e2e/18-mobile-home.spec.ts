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
    await expect(main.getByRole('button', { name: 'Quick add' })).toContainText('Quick add')
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
  })

  test('W14 the list has no Back to Home, the item page goes back to its list', async ({
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

    await expect(main.getByRole('link', { name: 'Back to Home' })).toHaveCount(0)
    const heading = main.getByRole('button', { name, exact: true })
    const headingBox = await heading.boundingBox()
    if (!headingBox) throw new Error('missing box')
    expect(headingBox.x).toBeLessThan(80)

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

  test('W12 the display-mode tray leads the toolbar at the height of Filter', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Modes'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)
    const first = main.getByRole('radiogroup', { name: 'Display mode' })
    const filter = main.getByRole('button', { name: 'Filter' })
    const [a, f] = [await first.boundingBox(), await filter.boundingBox()]
    if (!a || !f) throw new Error('missing box')
    expect(Math.abs(a.height - f.height)).toBeLessThanOrEqual(1)
    expect(a.x).toBeLessThan(f.x)
    const search = await main.getByRole('button', { name: 'Search', exact: true }).boundingBox()
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
