// KeyboardTapTarget (roadmap 28): on touch projects a hidden text field lies over "New item" /
// "Quick add"; force taps at the button's spot, so the tap reaches it as a finger would.
import { expect, test } from '@playwright/test'
import { createItem, createList, uniqueName } from './helpers'

// web 2.29.1 on a phone: two adds in a row both focus the title, the "Added" toasts replace each
// other, and the "make default" sort offer keeps the one-row toolbar intact.
test.describe('2.29.1 phone adds and default sort', () => {
  test('two adds in a row focus the title each time and show only the latest toast', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Phone adds'), 'wishlist')
    await createItem(request, list.id, uniqueName('Seed'))
    await page.goto(`/lists/${list.id}`)
    const first = uniqueName('First')
    const second = uniqueName('Second')
    for (const name of [first, second]) {
      await page.getByRole('button', { name: 'New item' }).first().click({ force: true })
      const title = page.getByRole('textbox', { name: 'Title' })
      await expect(title).toBeFocused()
      await title.fill(name)
      await title.press('Enter')
      await expect(page.getByText(`Added “${name}”`, { exact: true })).toBeVisible()
    }
    await expect(page.getByText(`Added “${first}”`, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Open' }).click()
    await expect(page.getByRole('heading', { name: second })).toBeVisible()
  })

  test('the default sort offer sits under the toolbar, which stays one row', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Phone sort'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const sort = page.getByRole('button', { name: 'Sort', exact: true })
    await sort.click()
    await page.getByRole('menuitemradio', { name: 'Title', exact: true }).click()
    const offer = page.getByRole('button', { name: 'Make “Title” the default sort for this list' })
    await expect(offer).toBeVisible()
    const add = await page.getByRole('button', { name: 'New item' }).first().boundingBox()
    const sortBox = await sort.boundingBox()
    const search = await page
      .getByRole('searchbox', { name: 'Search items by title' })
      .boundingBox()
    // One row: + New item and the search sit level with Sort; the offer is below them.
    expect(Math.abs(add!.y - sortBox!.y)).toBeLessThan(4)
    expect(search!.width).toBeGreaterThan(60)
    expect((await offer.boundingBox())!.y).toBeGreaterThan(sortBox!.y + sortBox!.height)
    await offer.click()
    await expect(page.getByText('Default sort saved', { exact: true })).toBeVisible()
    await expect(offer).toHaveCount(0)
  })

  test('every sort of a movie list loads on a phone', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Phone sorts'), 'movie')
    await createItem(request, list.id, `Film ${uniqueName('a')}`, {
      metadata: { release_year: 1999, runtime_minutes: 136, director: 'Someone' },
    })
    await createItem(request, list.id, `Film ${uniqueName('b')}`)
    await page.goto(`/lists/${list.id}`)
    const sort = page.getByRole('button', { name: 'Sort', exact: true })
    await sort.click()
    const labels = await page.getByRole('menuitemradio').allTextContents()
    await page.keyboard.press('Escape')
    for (const label of labels) {
      await sort.click()
      await page.getByRole('menuitemradio', { name: label, exact: true }).click()
      await expect(page.getByRole('link', { name: /Film/ }).first()).toBeVisible()
      await expect(page.getByText('Couldn’t load the items')).toHaveCount(0)
    }
  })
})

test.describe('2.30.1 phone title focus on every add path', () => {
  test('Quick add from Home, twice, then New item after switching lists', async ({
    page,
    request,
  }) => {
    const one = await createList(request, uniqueName('Phone one'), 'wishlist')
    const two = await createList(request, uniqueName('Phone two'), 'wishlist')
    await createItem(request, one.id, uniqueName('Seed'))
    await createItem(request, two.id, uniqueName('Seed'))
    await page.goto('/')
    for (const name of [uniqueName('Home Q1'), uniqueName('Home Q2')]) {
      await page.getByRole('button', { name: 'Quick add' }).click({ force: true })
      const dialog = page.getByRole('dialog', { name: 'Quick add' })
      const title = dialog.getByRole('textbox', { name: 'Title' })
      await expect(title).toBeFocused()
      await expect(page.locator('[data-keyboard-proxy]')).toHaveCount(0)
      await title.fill(name)
      await title.press('Enter')
      await expect(page.getByText(`Added “${name}”`, { exact: true })).toBeVisible()
    }
    for (const list of [one, two]) {
      await page.goto(`/lists/${list.id}`)
      await page.getByRole('button', { name: 'New item' }).first().click({ force: true })
      await expect(page.getByRole('textbox', { name: 'Title' })).toBeFocused()
      await expect(page.locator('[data-keyboard-proxy]')).toHaveCount(0)
    }
  })
})
