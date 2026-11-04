import { expect, test } from '@playwright/test'
import { createList, itemPanel, uniqueName } from './helpers'

test.describe('F018-W3 Wishlist: a title is enough, price is the only type field', () => {
  test('a wishlist item with only a title is valid and stays after reload', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Wishlist'), 'wishlist')
    const title = uniqueName('Standing desk')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    await page.reload()
    await expect(itemPanel(page).getByRole('heading', { level: 1, name: title })).toBeVisible()
  })

  test('price is added with "+ Add field" as a single amount, then turned into a range', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Wishlist'), 'wishlist')
    const title = uniqueName('Headphones')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await page.getByRole('menuitem', { name: 'Price', exact: true }).click()
    await panel.getByRole('textbox', { name: 'Price', exact: true }).fill('150')
    await panel.getByRole('button', { name: 'Save price' }).click()
    await expect(panel.getByRole('button', { name: 'Edit price' })).toBeVisible()

    await page.reload()
    const item = itemPanel(page)
    await item.getByRole('button', { name: 'Edit price' }).click()
    await expect(item.getByRole('textbox', { name: 'Price', exact: true })).toHaveValue('150.00')
    await item.getByRole('button', { name: 'Add range' }).click()
    await item.getByRole('textbox', { name: 'Maximum price' }).fill('200')
    await item.getByRole('button', { name: 'Save price' }).click()
    await expect(item.getByRole('button', { name: 'Edit price' })).toBeVisible()

    await page.reload()
    await itemPanel(page).getByRole('button', { name: 'Edit price' }).click()
    await expect(itemPanel(page).getByRole('textbox', { name: 'Minimum price' })).toHaveValue(
      '150.00',
    )
    await expect(itemPanel(page).getByRole('textbox', { name: 'Maximum price' })).toHaveValue(
      '200.00',
    )
  })
})

test.describe('F018-W3 Vehicles: no price, every field optional', () => {
  test('a vehicle item needs only a title and offers no Price in the add-field or sort menus', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Vehicles'), 'vehicle')
    const title = uniqueName('Motorbike')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()
    const panel = itemPanel(page)
    await panel.getByRole('textbox', { name: 'Title' }).fill(title)
    await panel.getByRole('textbox', { name: 'Title' }).press('Enter')
    await expect(panel.getByRole('heading', { level: 1, name: title })).toBeVisible()

    await panel.getByRole('button', { name: 'Add field' }).click()
    await expect(page.getByRole('menuitem', { name: 'Make', exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Price', exact: true })).toBeHidden()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Sort' }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Make', exact: true })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: 'Price', exact: true })).toBeHidden()
  })
})
