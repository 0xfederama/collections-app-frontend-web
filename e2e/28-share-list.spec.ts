import { expect, test } from '@playwright/test'
import { createItem, createList, uniqueName } from './helpers'

// Roadmap 40 (web 3.7.0): "Share" in the list "…" menu. The test stack is plain http, so there is
// no secure context; navigator.share and navigator.clipboard are removed to be sure the copy
// dialog is the path under test. Runs on desktop (chromium) and the phone (mobile-webkit).

test.describe('roadmap 40 share list as text', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(Navigator.prototype, 'share')
      Reflect.deleteProperty(Navigator.prototype, 'clipboard')
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    })
  })

  test('opens the copy dialog with the shown items only', async ({ page, request }) => {
    const name = uniqueName('Share')
    const list = await createList(request, name, null)
    const token = name.split(' ').at(-1) ?? ''
    for (const title of ['Zed', 'Alpha', 'Émile & Co 🎬']) {
      await createItem(request, list.id, `${title} ${token}`)
    }
    await createItem(request, list.id, `Other ${token}`)
    await page.goto(`/lists/${list.id}?q=${encodeURIComponent('Alpha')}`)
    const rows = page.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(rows).toHaveCount(1)

    await page
      .getByRole('main')
      .getByRole('button', { name: `More actions for ${name}` })
      .click()
    await page.getByRole('menuitem', { name: /^Share/ }).click()
    const dialog = page.getByRole('dialog', { name: `Share ${name}` })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('textbox')).toHaveValue(`* Alpha ${token}`)

    await dialog.getByRole('button', { name: 'Copy' }).click()
    await expect(dialog.getByText(/^Copied$|Select the text and copy it manually/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Close' }).first().click()
    await expect(dialog).toBeHidden()
  })
})
