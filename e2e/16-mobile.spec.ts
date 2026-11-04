import { expect, test } from '@playwright/test'
import { createItem, createList, itemUrl, uniqueName } from './helpers'

// F-025: phone layout. Runs only in the `mobile-webkit` project (iPhone 15 viewport, touch).

test.describe('F-025 mobile', () => {
  test('W1 the viewport meta forbids zoom on focus (maximum-scale=1)', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /maximum-scale=1(?!\d)/,
    )
  })

  test('W2 the list toolbar is one row that fits the screen', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Toolbar'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)

    const controls = [
      main.getByRole('searchbox', { name: /Search items by title/ }),
      main.getByRole('button', { name: 'Filter' }),
      main.getByRole('combobox', { name: 'Sort' }),
      main.getByRole('radiogroup', { name: 'Display mode' }),
      main.getByRole('button', { name: 'New item' }),
    ]
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('no viewport')
    const centres: number[] = []
    for (const control of controls) {
      await expect(control).toBeVisible()
      const box = await control.boundingBox()
      if (!box) throw new Error('control has no box')
      centres.push(box.y + box.height / 2)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    }
    // Controls differ in height, so their tops differ; one row means the centres line up.
    expect(
      Math.max(...centres) - Math.min(...centres),
      `centres: ${centres.join(', ')}`,
    ).toBeLessThanOrEqual(4)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('W3 the menu button shares the title row without overlapping it', async ({
    page,
    request,
  }) => {
    const name = uniqueName('Title row')
    const list = await createList(request, name, 'movie')
    await page.goto(`/lists/${list.id}`)
    const menu = page.getByRole('button', { name: 'Open menu' })
    const title = page.getByRole('main').getByRole('button', { name, exact: true })
    await expect(menu).toBeVisible()
    await expect(title).toBeVisible()
    const menuBox = await menu.boundingBox()
    const titleBox = await title.boundingBox()
    if (!menuBox || !titleBox) throw new Error('missing box')
    // Same row: the vertical ranges overlap.
    expect(menuBox.y).toBeLessThan(titleBox.y + titleBox.height)
    expect(titleBox.y).toBeLessThan(menuBox.y + menuBox.height)
    // Side by side: no horizontal overlap.
    const apart =
      menuBox.x + menuBox.width <= titleBox.x + 0.5 ||
      titleBox.x + titleBox.width <= menuBox.x + 0.5
    expect(apart).toBe(true)
  })

  test('W5 a long press on an item opens Move and Delete', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Long press'), 'movie')
    const title = uniqueName('Hold me')
    await createItem(request, list.id, title)
    await page.goto(`/lists/${list.id}`)
    const row = page.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(row).toHaveCount(1)

    // Playwright's touchscreen only taps, and WebKit has no CDP touch input. The app's long press
    // starts from a native `pointerdown` with a non-mouse pointerType and fires 500 ms later if no
    // pointermove / pointerup / pointercancel follows, so we dispatch just that pointerdown on the
    // row (clear of the title link) and wait for the menu.
    const box = await row.boundingBox()
    if (!box) throw new Error('row has no box')
    await row.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      pointerId: 7,
      isPrimary: true,
      button: 0,
      buttons: 1,
      bubbles: true,
      clientX: box.x + box.width - 4,
      clientY: box.y + box.height / 2,
    })
    await expect(page.getByRole('menuitem', { name: 'Move', exact: true })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(row).toHaveCount(0)
  })

  test('W5 a short tap on an item still opens it', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Tap'), 'movie')
    const title = uniqueName('Tap me')
    const item = await createItem(request, list.id, title)
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('link', { name: title }).tap()
    await expect(page).toHaveURL(new RegExp(`${itemUrl(list.id, item.id)}$`))
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0)
  })
})
