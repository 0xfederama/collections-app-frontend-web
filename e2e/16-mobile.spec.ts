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
      main.getByRole('button', { name: 'Search', exact: true }),
      main.getByRole('button', { name: 'Filter' }),
      main.getByRole('button', { name: 'Sort', exact: true }),
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

  test('W8 Filter and Sort are matching buttons the size of New item, and search says "Search"', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Controls'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)

    const sizes: Record<string, { width: number; height: number }> = {}
    for (const name of ['Search', 'Filter', 'Sort', 'New item']) {
      const button = main.getByRole('button', { name, exact: true })
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      if (!box) throw new Error(`${name} has no box`)
      sizes[name] = box
    }
    const filter = sizes['Filter']
    const sort = sizes['Sort']
    const create = sizes['New item']
    const search = sizes['Search']
    if (!filter || !sort || !create || !search) throw new Error('missing size')
    expect(Math.abs(search.width - filter.width), 'Search vs Filter width').toBeLessThanOrEqual(1)
    expect(Math.abs(search.height - filter.height), 'Search vs Filter height').toBeLessThanOrEqual(
      1,
    )
    expect(Math.abs(filter.width - sort.width), 'Filter vs Sort width').toBeLessThanOrEqual(1)
    expect(Math.abs(filter.height - sort.height), 'Filter vs Sort height').toBeLessThanOrEqual(1)
    expect(Math.abs(filter.width - create.width), 'Filter vs New item width').toBeLessThanOrEqual(1)
    expect(
      Math.abs(filter.height - create.height),
      'Filter vs New item height',
    ).toBeLessThanOrEqual(1)

    await main.getByRole('button', { name: 'Sort', exact: true }).tap()
    await expect(page.getByRole('menuitemradio', { checked: true })).toHaveCount(1)
  })

  test('W11 Search expands and focuses the field, filters, and Close search keeps the query', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Search'), 'movie')
    const keep = uniqueName('Keepme')
    const other = uniqueName('Other')
    await createItem(request, list.id, keep)
    await createItem(request, list.id, other)
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    const rows = main.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(rows).toHaveCount(2)
    await expect(main.getByRole('searchbox', { name: /Search items by title/ })).toHaveCount(0)

    await main.getByRole('button', { name: 'Search', exact: true }).tap()
    const field = main.getByRole('searchbox', { name: /Search items by title/ })
    await expect(field).toBeVisible()
    await expect(field).toBeFocused()
    await expect(field).toHaveAttribute('placeholder', 'Search')
    await field.fill(keep)
    await expect(rows).toHaveCount(1)
    await expect(rows).toContainText(keep)

    await main.getByRole('button', { name: 'Close search' }).tap()
    await expect(field).toHaveCount(0)
    await expect(page).toHaveURL(/[?&]q=/)
    await expect(rows).toHaveCount(1)
    await expect(main.getByRole('button', { name: 'Search (active)', exact: true })).toBeVisible()
  })

  test('W11 the viewport meta has viewport-fit=cover and maximum-scale=1', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(content).toMatch(/viewport-fit=cover/)
    expect(content).toMatch(/maximum-scale=1(?!\d)/)
  })

  test('W11 the page does not overflow horizontally', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Overflow'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    await expect(page.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test.describe('dark', () => {
    test.use({ colorScheme: 'dark' })

    test('W11 the html background is the --bg token, same as body, and not white', async ({
      page,
    }) => {
      await page.goto('/')
      await expect(page.getByRole('main')).toBeVisible()
      const colors = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.backgroundColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--bg')
          .trim()
        document.body.appendChild(probe)
        const token = getComputedStyle(probe).backgroundColor
        probe.remove()
        return {
          html: getComputedStyle(document.documentElement).backgroundColor,
          body: getComputedStyle(document.body).backgroundColor,
          token,
        }
      })
      expect(colors.html).toBe(colors.body)
      expect(colors.html).toBe(colors.token)
      expect(colors.html).not.toBe('rgb(255, 255, 255)')
    })
  })

  test('W9 a movie row shows runtime and director, a book row the page count before the author', async ({
    page,
    request,
  }) => {
    const movies = await createList(request, uniqueName('Movies'), 'movie')
    const film = uniqueName('Film')
    await createItem(request, movies.id, film, {
      metadata: { runtime_minutes: 136, director: 'Lana Wachowski' },
    })
    await page.goto(`/lists/${movies.id}`)
    const movieRow = page.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(movieRow).toHaveCount(1)
    await expect(movieRow).toContainText('136')
    await expect(movieRow).toContainText('Lana Wachowski')

    const books = await createList(request, uniqueName('Books'), 'book')
    await createItem(request, books.id, uniqueName('Novel'), {
      metadata: { pages: 321, author: 'Ada Writer' },
    })
    await page.goto(`/lists/${books.id}`)
    const bookRow = page.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(bookRow).toHaveCount(1)
    await expect(bookRow).toContainText('321 p.')
    await expect(bookRow).toContainText('Ada Writer')
    const text = (await bookRow.textContent()) ?? ''
    expect(text.indexOf('321 p.')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('321 p.')).toBeLessThan(text.indexOf('Ada Writer'))
  })

  test('W10 the menu button sits in the title row left of the title, and opens the drawer', async ({
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
    // Left of the title, no horizontal overlap.
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(titleBox.x + 0.5)

    await menu.tap()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('navigation', { name: 'Library' })).toBeVisible()
  })

  test('W10 the item page has a back link in the slot and no menu button', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Back slot'), 'movie')
    const item = await createItem(request, list.id, uniqueName('Film'))
    await page.goto(itemUrl(list.id, item.id))
    const back = page.getByRole('main').getByRole('link', { name: /^Back to / })
    await expect(back).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
    const backBox = await back.boundingBox()
    const heading = await page.getByRole('heading', { level: 1 }).boundingBox()
    if (!backBox || !heading) throw new Error('missing box')
    expect(backBox.x).toBeLessThan(heading.x + heading.width)
    await back.tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`))
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
