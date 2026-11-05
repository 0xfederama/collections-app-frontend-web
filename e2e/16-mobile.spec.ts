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
      main.getByRole('button', { name: 'View options' }),
      main.getByRole('searchbox', { name: /Search items by title/ }),
      main.getByRole('button', { name: 'Filter' }),
      main.getByRole('button', { name: 'Sort', exact: true }),
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

  test('W8 Filter and Sort are matching buttons the size of New item, and View options matches them', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Controls'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)

    const sizes: Record<string, { width: number; height: number }> = {}
    for (const name of ['View options', 'Filter', 'Sort', 'New item']) {
      const button = main.getByRole('button', { name, exact: true })
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      if (!box) throw new Error(`${name} has no box`)
      sizes[name] = box
    }
    const filter = sizes['Filter']
    const sort = sizes['Sort']
    const create = sizes['New item']
    const search = sizes['View options']
    if (!filter || !sort || !create || !search) throw new Error('missing size')
    expect(
      Math.abs(search.width - filter.width),
      'View options vs Filter width',
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(search.height - filter.height),
      'View options vs Filter height',
    ).toBeLessThanOrEqual(1)
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

  test('the Search field is always visible and filters', async ({ page, request }) => {
    const list = await createList(request, uniqueName('Search'), 'movie')
    const keep = uniqueName('Keepme')
    const other = uniqueName('Other')
    await createItem(request, list.id, keep)
    await createItem(request, list.id, other)
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    const rows = main.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(rows).toHaveCount(2)
    const field = main.getByRole('searchbox', { name: /Search items by title/ })
    await expect(field).toBeVisible()
    await expect(field).toHaveAttribute('placeholder', 'Search')
    await field.fill(keep)
    await expect(rows).toHaveCount(1)
    await expect(rows).toContainText(keep)
    await expect(page).toHaveURL(/[?&]q=/)
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

  test('F-026 W7 a duplicate title in the new-item page shows inline', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Dup phone'), 'wishlist')
    const title = uniqueName('Same thing')
    await createItem(request, list.id, title)
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).first().click()
    const field = page.getByRole('textbox', { name: 'Title' })
    await field.fill(title)
    await field.press('Enter')
    await expect(page.getByText('An item with this title is already in this list.')).toBeVisible()
    await expect(field).toHaveValue(title)
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

  test('W5 the item back control goes to its list and keeps the list search and sort', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Back query'), 'movie')
    const item = await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`${itemUrl(list.id, item.id)}?q=Film&sort=title`)
    const back = page.getByRole('main').getByRole('link', { name: /^Back to / })
    await back.tap()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}\\?q=Film&sort=title$`))
  })

  test('W10 the item page has a back link in the slot and no menu button (W14)', async ({
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

  test('F-025 the document scrolls, not main (Safari bars turn translucent)', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Long'), 'movie')
    for (let index = 0; index < 30; index += 1) {
      await createItem(request, list.id, uniqueName(`Film ${index}`))
    }
    await page.goto(`/lists/${list.id}`)
    await expect(
      page.getByRole('list', { name: 'Items' }).getByRole('listitem').first(),
    ).toBeVisible()
    const scrolls = await page.evaluate(() => {
      const doc = document.scrollingElement ?? document.documentElement
      return doc.scrollHeight > window.innerHeight
    })
    expect(scrolls).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 300))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('F-025 the phone toolbar reads View options, search, Filter, Sort, New item; search is widest', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Order'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)
    const controls = [
      main.getByRole('button', { name: 'View options' }),
      main.getByRole('searchbox', { name: /Search items by title/ }),
      main.getByRole('button', { name: 'Filter' }),
      main.getByRole('button', { name: 'Sort', exact: true }),
      main.getByRole('button', { name: 'New item' }),
    ]
    const boxes = []
    for (const control of controls) {
      await expect(control).toBeVisible()
      const box = await control.boundingBox()
      if (!box) throw new Error('control has no box')
      boxes.push(box)
    }
    for (let k = 1; k < boxes.length; k++) {
      expect(boxes[k]?.x ?? 0, `control ${k} is right of ${k - 1}`).toBeGreaterThan(
        (boxes[k - 1]?.x ?? 0) + (boxes[k - 1]?.width ?? 0) - 1,
      )
    }
    const widths = boxes.map((box) => box.width)
    expect(widths[1]).toBe(Math.max(...widths))
  })

  for (const mode of ['Compact rows', 'Grid'] as const) {
    test(`F-025 ${mode}: 8 streaming platforms never touch the title and show a +N tile`, async ({
      page,
      request,
    }) => {
      const list = await createList(request, uniqueName('Many tiles'), 'movie')
      const title = uniqueName('Film with a rather long title')
      await createItem(request, list.id, title, {
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
      await page.goto(`/lists/${list.id}`)
      const main = page.getByRole('main')
      await main.getByRole('button', { name: 'View options' }).click()
      await page.getByRole('menuitemradio', { name: mode }).click()
      const row = main.getByRole('list', { name: 'Items' }).getByRole('listitem')
      await expect(row).toHaveCount(1)
      const more = row.getByRole('img', { name: /\d+ more/ })
      await expect(more).toBeVisible()
      // The link is inline: its box spans the whole text even where the parent clips it, so
      // clip it to the parent (the visible part of the title).
      const titleBox = await row.getByRole('link', { name: title }).evaluate((node) => {
        const a = node.getBoundingClientRect()
        const p = (node.parentElement ?? node).getBoundingClientRect()
        const x = Math.max(a.x, p.x)
        const right = Math.min(a.right, p.right)
        return { x, y: a.y, width: Math.max(0, right - x), height: a.height }
      })
      const tiles = await more.evaluate((node) =>
        [...(node.parentElement?.children ?? [])].map((child) => {
          const r = child.getBoundingClientRect()
          return { x: r.x, y: r.y, width: r.width, height: r.height }
        }),
      )
      expect(tiles.length).toBeGreaterThan(1)
      for (const tile of tiles) {
        const apart =
          tile.x >= titleBox.x + titleBox.width ||
          tile.x + tile.width <= titleBox.x ||
          tile.y >= titleBox.y + titleBox.height ||
          tile.y + tile.height <= titleBox.y
        expect(apart, `tile ${JSON.stringify(tile)} vs title ${JSON.stringify(titleBox)}`).toBe(
          true,
        )
      }
    })
  }
})
