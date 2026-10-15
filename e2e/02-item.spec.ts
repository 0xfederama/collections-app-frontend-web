import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, uniqueName } from './helpers'

test.describe('F003-W1 item: kind field, price, website, sort by kind key', () => {
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
    await page
      .getByRole('dialog', { name: 'Quick add' })
      .getByRole('textbox', { name: 'Title' })
      .fill(title)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const panel = itemPanel(page)
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    // Each field is edited in place and saved on its own (pen, input, Enter or ✓).
    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Release year' }).click()
    await panel.getByRole('textbox', { name: 'Release year' }).fill('2005')
    await panel.getByRole('button', { name: 'Save release year' }).click()
    await expect(panel.getByRole('button', { name: 'Edit release year' })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Price range' }).click()
    await panel.getByRole('textbox', { name: 'Minimum price' }).fill('10')
    await panel.getByRole('textbox', { name: 'Maximum price' }).fill('20')
    await panel.getByRole('button', { name: 'Save price' }).click()
    await expect(panel.getByRole('button', { name: 'Edit price' })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Website' }).click()
    await panel.getByRole('textbox', { name: 'Website' }).fill(website)
    await panel.getByRole('textbox', { name: 'Website' }).press('Enter')
    await expect(panel.getByRole('button', { name: 'Edit website' })).toBeVisible()

    await page.reload()
    const item = itemPanel(page)
    await expect(item.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(item.getByText('2005', { exact: true })).toBeVisible()
    await expect(item.getByText(/10\D+20/)).toBeVisible()
    // A movie has no Website link button (F-002); the saved value reads in the Details row.
    await expect(item.getByText(website)).toBeVisible()

    // Remove the price, reload: it is gone.
    await item.getByRole('button', { name: 'Edit price' }).click()
    await item.getByRole('button', { name: 'Remove price' }).click()
    await expect(item.getByRole('button', { name: 'Edit price' })).toBeHidden()
    await page.reload()
    await expect(itemPanel(page).getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(itemPanel(page).getByRole('button', { name: 'Edit price' })).toBeHidden()

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
