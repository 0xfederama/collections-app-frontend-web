import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('F003-W1 item: type field, website, sort by field key', () => {
  test('create a movie item, fill it in, save, reload, values stick', async ({ page, request }) => {
    const listName = uniqueName('Films')
    const title = '[mock] movie name'
    const older = uniqueName('Zodiac')
    const website = `https://example.com/${Date.now()}`
    const list = await createList(request, listName, 'movie')
    // Created first, so it is first in manual order; its year (2020) is later than the lookup's 2001.
    await createItem(request, list.id, older, { metadata: { release_year: 2020 } })

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    // F008-W9: "New item" in a list opens a draft in the side page; Enter on the title creates it.
    const panel = itemPanel(page)
    await panel.getByRole('combobox', { name: 'Title' }).fill(title)
    await panel.getByRole('combobox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    // The deterministic lookup filled the release year; populated fields are visible by default.
    await expect(panel.getByText('2001', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Edit release year' })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Website' }).click()
    await panel.getByRole('textbox', { name: 'Website' }).fill(website)
    await panel.getByRole('textbox', { name: 'Website' }).press('Enter')
    await expect(panel.getByRole('button', { name: 'Edit website' })).toBeVisible()

    await page.reload()
    const item = itemPanel(page)
    await expect(item.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // Populated type fields and the website remain visible after reload.
    await expect(item.getByText(website)).toBeVisible()
    await expect(item.getByText('2001', { exact: true })).toBeVisible()
    await expect(item.getByRole('textbox', { name: 'Release year' })).toBeHidden()
    await expect(item.getByRole('button', { name: 'Edit release year' })).toBeVisible()
    // A movie has no Website link button (F-002); the saved value reads in the Details row.
    await expect(item.getByText(website)).toBeVisible()

    // Sort by the field key (release year, ascending): 2001 before 2020.
    await page.goto(`/lists/${list.id}`)
    // Title links only: the row's website tile ("Open website <host>", 2.32.0) is a link too.
    const links = page
      .getByRole('list', { name: 'Items' })
      .getByRole('link', { name: /^(?!Open website )/ })
    // A movie list sorts by its type's default field (release year) until another is chosen.
    await expect(links).toHaveText([title, older])
    await page.getByRole('button', { name: 'Sort', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Manual' }).click()
    await expect(page).toHaveURL(/sort=manual/)
    await expect(links).toHaveText([older, title])
  })

  test('F011 simple field editor keeps label, input, and actions on one row', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Films'), 'movie')
    const item = await createItem(request, list.id, uniqueName('Heat'))
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(itemUrl(list.id, item.id))
      await page.getByRole('button', { name: 'Add field' }).click()
      await page.getByRole('menuitem', { name: 'Release year' }).click()

      const label = page.locator('dt').getByText('Release year', { exact: true })
      const input = page.getByRole('textbox', { name: 'Release year' })
      const save = page.getByRole('button', { name: 'Save release year' })
      const cancel = page.getByRole('button', { name: 'Cancel editing release year' })
      await expect(input).toBeVisible()
      const [labelBox, inputBox, saveBox, cancelBox] = await Promise.all([
        label.boundingBox(),
        input.boundingBox(),
        save.boundingBox(),
        cancel.boundingBox(),
      ])
      expect(labelBox).not.toBeNull()
      expect(inputBox).not.toBeNull()
      expect(saveBox).not.toBeNull()
      expect(cancelBox).not.toBeNull()
      const centerY = (box: NonNullable<typeof inputBox>) => box.y + box.height / 2
      expect(Math.abs(centerY(labelBox!) - centerY(inputBox!))).toBeLessThan(4)
      expect(Math.abs(centerY(inputBox!) - centerY(saveBox!))).toBeLessThan(4)
      expect(Math.abs(centerY(saveBox!) - centerY(cancelBox!))).toBeLessThan(4)
      expect(inputBox!.x).toBeGreaterThan(labelBox!.x)
      expect(saveBox!.x).toBeGreaterThan(inputBox!.x)
      expect(cancelBox!.x).toBeGreaterThan(saveBox!.x)
      await cancel.click()
    }
  })
})

test.describe('F011-W1/W2 streaming: no country, several platforms from a dropdown', () => {
  test('tick two services from the dropdown, save, reload, they stick', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Shows'), 'tv_show')
    const title = uniqueName('Severance')
    const item = await createItem(request, list.id, title)

    await page.goto(itemUrl(list.id, item.id))
    const panel = itemPanel(page)
    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Streaming' }).click()

    // F011-W1: no country field on the item — it comes from Settings.
    await expect(panel.getByText('Streaming country')).toBeHidden()
    await expect(panel.getByRole('combobox', { name: /country/i })).toBeHidden()

    // F011-W2: several services, ticked one after another in one dropdown.
    await panel.getByRole('button', { name: 'Choose platforms' }).click()
    await page.getByRole('menuitemcheckbox', { name: /Netflix/ }).click()
    await page.getByRole('menuitemcheckbox', { name: /Disney\+/ }).click()
    // The menu stays open so several can be ticked; close it before saving.
    await page.keyboard.press('Escape')

    // A service we ship no logo for can still be typed in.
    await panel.getByRole('textbox', { name: 'Another service' }).fill('Sky')
    await panel.getByRole('button', { name: 'Add', exact: true }).click()
    await panel.getByRole('button', { name: 'Save streaming' }).click()
    await expect(panel.getByRole('button', { name: 'Save streaming' })).toBeHidden()

    await page.reload()
    const shown = itemPanel(page)
    await expect(shown.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // Populated streaming fields come back read-only as three service tiles.
    for (const service of ['Netflix', 'Disney+', 'Sky']) {
      await expect(shown.getByRole('img', { name: service })).toBeVisible()
    }

    // Untick one and it is gone from the saved item.
    await shown.getByRole('button', { name: 'Edit streaming' }).click()
    await shown.getByRole('button', { name: 'Netflix, Disney+, Sky' }).click()
    await page.getByRole('menuitemcheckbox', { name: /Disney\+/ }).click()
    await page.keyboard.press('Escape')
    await shown.getByRole('button', { name: 'Save streaming' }).click()
    await expect(shown.getByRole('button', { name: 'Save streaming' })).toBeHidden()
    await page.reload()
    const updated = itemPanel(page)
    await expect(updated.getByRole('img', { name: 'Netflix' })).toBeVisible()
    await expect(updated.getByRole('img', { name: 'Sky' })).toBeVisible()
    await expect(updated.getByRole('img', { name: 'Disney+' })).toHaveCount(0)
  })
})

test.describe('D-085 price only on the types that have one', () => {
  test('add a price range to a wishlist item, reload, remove it', async ({ page, request }) => {
    const listName = uniqueName('Wishlist')
    const title = uniqueName('Espresso machine')
    const list = await createList(request, listName, 'wishlist')

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Price', exact: true }).click()
    await panel.getByRole('textbox', { name: 'Price', exact: true }).fill('10')
    await panel.getByRole('button', { name: 'Add range' }).click()
    await panel.getByRole('textbox', { name: 'Maximum price' }).fill('20')
    await panel.getByRole('button', { name: 'Save price' }).click()
    await expect(panel.getByRole('button', { name: 'Edit price' })).toBeVisible()

    await page.reload()
    const item = itemPanel(page)
    await expect(item.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // A populated price is visible by default and remains read-only.
    await expect(item.getByRole('button', { name: 'Edit price' })).toBeVisible()
    await expect(item.getByRole('textbox', { name: 'Price', exact: true })).toBeHidden()
    await expect(item.getByText(/10\D+20/)).toBeVisible()

    // Remove the price: the row stays (it was added), the value is gone.
    await item.getByRole('button', { name: 'Edit price' }).click()
    // Wait for the save itself before reloading, or the reload races the PATCH.
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/v1\/items\//.test(r.url()) && r.ok(),
    )
    await item.getByRole('button', { name: 'Remove price' }).click()
    await saved
    await expect(item.getByText(/10\D+20/)).toBeHidden()
    // After a reload it is not there at all.
    await page.reload()
    await expect(itemPanel(page).getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(itemPanel(page).getByRole('button', { name: 'Edit price' })).toBeHidden()
  })

  test('a movie offers no Price field, in the item page or the sort menu', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Films'), 'movie')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    await panel.getByRole('combobox', { name: 'Title' }).fill('[mock] movie name')
    await panel.getByRole('combobox', { name: 'Title' }).press('Enter')
    await panel.getByRole('button', { name: 'Add field' }).click()
    await expect(page.getByRole('menuitem', { name: 'Website' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Price', exact: true })).toBeHidden()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Sort', exact: true }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Release year' })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Price' })).toBeHidden()
  })
})

test.describe('F-022 W2 fixed pins per type', () => {
  test('a movie row shows its fixed runtime pin, and the list has no Pinned control', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Films'), 'movie')
    const title = uniqueName('Heat')
    await createItem(request, list.id, title, {
      metadata: { release_year: 2005, runtime_minutes: 117, director: 'Ada Auteur' },
    })

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'View options' }).click()
    await page.getByRole('menuitemradio', { name: 'Thumbnail rows' }).click()
    const row = page.getByRole('list', { name: 'Items' }).getByRole('listitem').filter({
      hasText: title,
    })
    await expect(row.getByText('117 min', { exact: true })).toBeVisible()
    await expect(row.getByText('2005', { exact: true })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Pinned fields' })).toHaveCount(0)
  })
})

test.describe('F016 Escape closes the opened item', () => {
  test('Escape returns to the list, but inside a field editor it only closes the editor', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Esc films'), 'movie')
    const title = uniqueName('Escape')
    const item = await createItem(request, list.id, title, { metadata: { release_year: 2001 } })
    await page.goto(itemUrl(list.id, item.id))
    const panel = itemPanel(page)
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    // An open field editor owns Escape: it cancels the edit and the item stays open.
    await panel.getByRole('button', { name: 'Edit title' }).click()
    await expect(panel.getByRole('textbox', { name: 'Title' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(panel.getByRole('textbox', { name: 'Title' })).toBeHidden()
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    // With nothing being edited, Escape closes the item like "Close details".
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}(\\?.*)?$`))
    await expect(itemPanel(page)).toBeHidden()
  })
})

test.describe('F-025 W12 display mode switch', () => {
  test('the View options button leads the toolbar at the height of Filter', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Modes'), 'movie')
    await createItem(request, list.id, uniqueName('Film'))
    await page.goto(`/lists/${list.id}`)
    const main = page.getByRole('main')
    await expect(main.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(1)
    const group = main.getByRole('button', { name: 'View options' })
    const filter = main.getByRole('button', { name: 'Filter' })
    const [a, f] = [await group.boundingBox(), await filter.boundingBox()]
    if (!a || !f) throw new Error('missing box')
    expect(Math.abs(a.height - f.height)).toBeLessThanOrEqual(1)
    expect(a.x).toBeLessThan(f.x)
  })
})
