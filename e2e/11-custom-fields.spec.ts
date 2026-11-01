import { expect, test } from '@playwright/test'
import { itemPanel, uniqueName } from './helpers'

test.describe('F014-W4 custom field list workflow', () => {
  // Custom types are gone (F-022 W1): the custom field goes on the built-in Vehicles type. Its name
  // is unique so a rerun on the same stack does not find two fields with the same label.
  test('adds a field to a built-in type, adds an item, sorts, and filters by the field', async ({
    page,
    request,
  }) => {
    const fieldName = uniqueName('Rating')
    await page.goto('/settings')
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByRole('button', { name: 'Types & fields' }).click()
    const region = page.getByRole('region', { name: 'Types & fields' })
    await region.getByRole('button', { name: /^Vehicles/ }).click()
    await region.getByLabel('New field name').fill(fieldName)
    await region.getByRole('combobox', { name: 'Field type' }).click()
    await page.getByRole('option', { name: 'Number' }).click()
    const createFieldResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/v1/types/vehicle/fields'),
    )
    await region.getByRole('button', { name: 'Add', exact: true }).click()
    const field = await (await createFieldResponse).json()

    await page.getByRole('button', { name: 'Close' }).click()
    const listResponse = await request.post('/api/v1/lists', {
      data: { name: uniqueName('Garage'), type: 'vehicle', folder_id: null },
    })
    expect(listResponse.status()).toBe(201)
    const list = await listResponse.json()

    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    const title = uniqueName('Roadster')
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: fieldName, exact: true }).click()
    const rating = panel.getByRole('textbox', { name: fieldName })
    await rating.fill('8')
    await panel.getByRole('button', { name: `Save ${fieldName}` }).click()
    await expect(panel.getByText('8', { exact: true })).toBeVisible()

    const lowerTitle = uniqueName('Hatchback')
    const second = await request.post(`/api/v1/lists/${list.id}/items`, {
      data: { title: lowerTitle, metadata: { [field.key]: 3 } },
    })
    expect(second.status()).toBe(201)
    await page.goto(`/lists/${list.id}`)
    const rows = page.getByRole('list', { name: 'Items' }).getByRole('link')
    await expect(rows).toHaveCount(2)

    await page.getByRole('combobox', { name: 'Sort' }).click()
    await page.getByRole('option', { name: fieldName, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`sort=${field.key}`))
    await expect(rows.first()).toContainText(lowerTitle)
    await expect(rows.nth(1)).toContainText(title)

    await page.getByRole('button', { name: '+ Filter' }).click()
    await page.getByRole('combobox', { name: 'Filter field' }).click()
    await page.getByRole('option', { name: fieldName, exact: true }).click()
    await page.getByRole('spinbutton', { name: `${fieldName} minimum` }).fill('7')
    await expect(page).toHaveURL(new RegExp(`filter_field=${field.key}.*filter_min=7`))
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(title)
  })
})
