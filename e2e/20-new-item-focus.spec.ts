import { expect, test } from '@playwright/test'
import { createList, itemPanel, uniqueName } from './helpers'

// F-026 W2, W6, W8: "New item" focuses the title field, the field is as tall as the ✓ button beside
// it, and the new-item view carries no "(draft)" label. The phone case is in 18-mobile-home.spec.ts.
test.describe('F-026 new item draft', () => {
  test('clicking New item focuses the title field, as tall as the save button, with no "(draft)"', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Focus list'), 'wishlist')
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('button', { name: 'New item' }).click()

    const panel = itemPanel(page)
    const title = panel.getByRole('textbox', { name: 'Title' })
    await expect(title).toBeFocused()
    await expect(panel.getByRole('article', { name: 'New item' })).not.toContainText('(draft)')

    const field = await title.boundingBox()
    const save = await panel.getByRole('button', { name: 'Save title' }).boundingBox()
    expect(field?.height).toBeGreaterThan(0)
    expect(field?.height).toBe(save?.height)
  })
})
