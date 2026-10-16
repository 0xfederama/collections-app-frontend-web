import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('F003-W1 item: kind field, website, sort by kind key', () => {
  test('create a movie item, fill it in, save, reload, values stick', async ({ page, request }) => {
    const listName = uniqueName('Films')
    const title = uniqueName('Heat')
    const older = uniqueName('Zodiac')
    const website = `https://example.com/${Date.now()}`
    const list = await createList(request, listName, 'movie')
    // Created first, so it is first in manual order; its year (2020) is later than ours (2005).
    await createItem(request, list.id, older, { metadata: { release_year: 2020 } })

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    // F008-W9: "New item" in a list opens a draft in the side page; Enter on the title creates it.
    const panel = itemPanel(page)
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    // Each field is edited in place and saved on its own (pen, input, Enter or ✓).
    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Release year' }).click()
    await panel.getByRole('textbox', { name: 'Release year' }).fill('2005')
    await panel.getByRole('button', { name: 'Save release year' }).click()
    await expect(panel.getByRole('button', { name: 'Edit release year' })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Website' }).click()
    await panel.getByRole('textbox', { name: 'Website' }).fill(website)
    await panel.getByRole('textbox', { name: 'Website' }).press('Enter')
    await expect(panel.getByRole('button', { name: 'Edit website' })).toBeVisible()

    await page.reload()
    const item = itemPanel(page)
    await expect(item.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // F009-W1: the item page is calm by default. The website shows, the kind field does not.
    await expect(item.getByText(website)).toBeVisible()
    await expect(item.getByText('2005', { exact: true })).toBeHidden()
    // Adding it back with "+ Add field" shows the saved value, read-only: no editor opens.
    await item.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Release year' }).click()
    await expect(item.getByRole('textbox', { name: 'Release year' })).toBeHidden()
    await expect(item.getByText('2005', { exact: true })).toBeVisible()
    // A movie has no Website link button (F-002); the saved value reads in the Details row.
    await expect(item.getByText(website)).toBeVisible()

    // Sort by the kind key (release year, ascending): 2005 before 2020.
    await page.goto(`/lists/${list.id}`)
    const links = page.getByRole('list', { name: 'Items' }).getByRole('link')
    await expect(links).toHaveText([older, title])
    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: 'Release year' }).click()
    await expect(page).toHaveURL(/sort=kind_key/)
    await expect(links).toHaveText([title, older])
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

    await page.reload()
    const shown = itemPanel(page)
    await expect(shown.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // F009-W1: it comes back read-only, as the three service tiles.
    await shown.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Streaming' }).click()
    for (const service of ['Netflix', 'Disney+', 'Sky']) {
      await expect(shown.getByRole('img', { name: service })).toBeVisible()
    }

    // Untick one and it is gone from the saved item.
    await shown.getByRole('button', { name: 'Edit streaming' }).click()
    await shown.getByRole('button', { name: 'Netflix, Disney+, Sky' }).click()
    await page.getByRole('menuitemcheckbox', { name: /Disney\+/ }).click()
    await page.keyboard.press('Escape')
    await shown.getByRole('button', { name: 'Save streaming' }).click()
    await page.reload()
    await itemPanel(page).getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Streaming' }).click()
    await expect(itemPanel(page).getByRole('img', { name: 'Netflix' })).toBeVisible()
    await expect(itemPanel(page).getByRole('img', { name: 'Sky' })).toBeVisible()
    await expect(itemPanel(page).getByRole('img', { name: 'Disney+' })).toHaveCount(0)
  })
})

test.describe('D-085 price only on the kinds that have one', () => {
  test('add a price range to a car item, reload, remove it', async ({ page, request }) => {
    const listName = uniqueName('Cars')
    const title = uniqueName('Miata')
    const list = await createList(request, listName, 'car')

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
    // F009-W1: the price is hidden until it is added with "+ Add field", then it reads.
    await expect(item.getByRole('button', { name: 'Edit price' })).toBeHidden()
    await item.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Price', exact: true }).click()
    await expect(item.getByRole('textbox', { name: 'Price', exact: true })).toBeHidden()
    await expect(item.getByText(/10\D+20/)).toBeVisible()

    // Remove the price: the row stays (it was added), the value is gone.
    await item.getByRole('button', { name: 'Edit price' }).click()
    await item.getByRole('button', { name: 'Remove price' }).click()
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
    await panel.getByRole('textbox', { name: 'Title' }).fill(uniqueName('Heat'))
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await panel.getByRole('button', { name: 'Add field' }).click()
    await expect(page.getByRole('menuitem', { name: 'Website' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Price', exact: true })).toBeHidden()
    await page.keyboard.press('Escape')

    await page.getByRole('combobox', { name: 'Sort' }).click()
    await expect(page.getByRole('option', { name: 'Release year' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Price' })).toBeHidden()
  })
})

test.describe('F009-W3 pinned fields: up to two, in order', () => {
  test('two fields in order: the first beside the title, the second in the corner; unpinning promotes', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Films'), 'movie')
    const title = uniqueName('Heat')
    await createItem(request, list.id, title, {
      metadata: { release_year: 2005, runtime_minutes: 117 },
    })

    await page.goto(`/lists/${list.id}`)
    // The segmented control's radios are sr-only inside their label, so check it directly.
    await page.getByRole('radio', { name: 'Thumbnail rows' }).check({ force: true })
    const row = page.getByRole('list', { name: 'Items' }).getByRole('listitem').filter({
      hasText: title,
    })

    const pinnedMenu = page.getByRole('button', { name: 'Pinned fields' })
    await pinnedMenu.click()
    const checkbox = (name: string) => page.getByRole('menuitemcheckbox', { name })
    // The kind default is runtime + streaming; both are set on this item, so untick them to start
    // from an empty selection.
    await checkbox('Runtime').click()
    await checkbox('Streaming').click()
    // Two fields in a row, in the order they are ticked; a third cannot be added.
    await checkbox('Release year').click()
    await checkbox('Runtime').click()
    await expect(checkbox('Streaming')).toBeDisabled()
    await page.keyboard.press('Escape')

    // The first pinned field reads next to the title, the second at the right end of the row.
    const titleBox = await row.getByRole('link', { name: title }).boundingBox()
    const firstBox = await row.getByText('2005').boundingBox()
    const secondBox = await row.getByText('117 min').boundingBox()
    expect(Math.abs(firstBox!.y - titleBox!.y)).toBeLessThan(24)
    expect(secondBox!.x).toBeGreaterThan(firstBox!.x)

    // Unpinning the first promotes the second to first: it moves back beside the title.
    await pinnedMenu.click()
    await checkbox('Release year').click()
    // Only one field is pinned now, so the free ones are offered again.
    await expect(checkbox('Release year')).toBeEnabled()
    await page.keyboard.press('Escape')
    const promoted = await row.getByText('117 min').boundingBox()
    expect(Math.abs(promoted!.y - titleBox!.y)).toBeLessThan(24)
    await expect(row.getByText('2005')).toBeHidden()
  })
})
