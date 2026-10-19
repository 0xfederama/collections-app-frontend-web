import { expect, test } from '@playwright/test'
import { itemPanel, uniqueName } from './helpers'

test.describe('F014-W4 custom field list workflow', () => {
  test('creates a type and field, adds an item, pins, sorts, and filters by the field', async ({
    page,
    request,
  }) => {
    const typeName = uniqueName('Board games')
    await page.goto('/settings')
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('button', { name: 'Types & fields' }).click()
    await page.getByRole('button', { name: 'New type' }).click()
    await page.getByLabel('Type name').fill(typeName)
    const createTypeResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/v1/types'),
    )
    await page.getByRole('button', { name: 'Create type' }).click()
    const type = await (await createTypeResponse).json()
    const region = page.getByRole('region', { name: 'Types & fields' })
    await region.getByLabel('New field name').fill('Rating')
    await region.getByRole('combobox', { name: 'Field type' }).click()
    await page.getByRole('option', { name: 'Number' }).click()
    const createFieldResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/api/v1/types/${type.key}/fields`),
    )
    await region.getByRole('button', { name: 'Add', exact: true }).click()
    await createFieldResponse

    await page.getByRole('button', { name: 'Close' }).click()
    const listResponse = await request.post('/api/v1/lists', {
      data: { name: uniqueName('Tabletop'), type: type.key, folder_id: null },
    })
    expect(listResponse.status()).toBe(201)
    const list = await listResponse.json()

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    const title = uniqueName('Chess set')
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Rating' }).click()
    const rating = panel.getByRole('textbox', { name: 'Rating' })
    await rating.fill('8')
    await panel.getByRole('button', { name: 'Save rating' }).click()
    await expect(panel.getByText('8', { exact: true })).toBeVisible()

    const lowerTitle = uniqueName('Card game')
    const second = await request.post(`/api/v1/lists/${list.id}/items`, {
      data: { title: lowerTitle, metadata: { rating: 3 } },
    })
    expect(second.status()).toBe(201)
    await page.goto(`/lists/${list.id}`)
    const rows = page.getByRole('list', { name: 'Items' }).getByRole('link')
    await expect(rows).toHaveCount(2)

    await page.getByRole('button', { name: 'Pinned fields' }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Rating' }).click()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('list', { name: 'Items' }).getByRole('listitem').filter({ hasText: title }),
    ).toContainText('8')

    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await expect(page).toHaveURL(/sort=rating/)
    await expect(rows.first()).toContainText(lowerTitle)
    await expect(rows.nth(1)).toContainText(title)

    await page.getByRole('combobox', { name: 'Filter field' }).click()
    await page.getByRole('option', { name: 'Rating' }).click()
    await page.getByRole('spinbutton', { name: 'Rating minimum' }).fill('7')
    await expect(page).toHaveURL(/filter_field=rating.*filter_min=7/)
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(title)
  })
})
