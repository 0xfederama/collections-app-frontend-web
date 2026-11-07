// KeyboardTapTarget (roadmap 28): on touch projects a hidden text field lies over "New item" /
// "Quick add"; force taps at the button's spot, so the tap reaches it as a finger would.
import { expect, test, type Page } from '@playwright/test'
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
    await page.getByRole('button', { name: 'New item' }).click({ force: true })

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

// web 2.30.1: every add path ends with the title as document.activeElement and no keyboard proxy
// left behind (the proxy only bridges the tap to the field that mounts after it).
const titleIsActive = (page: Page) =>
  page.waitForFunction(() => {
    const active = document.activeElement
    return (
      active instanceof HTMLInputElement &&
      active.getAttribute('aria-label') !== null &&
      !active.hasAttribute('data-keyboard-proxy') &&
      document.querySelector('[data-keyboard-proxy]') === null
    )
  })

test.describe('2.30.1 title focus on every add path (desktop)', () => {
  test('repeated New item, with and without a draft open, and after a list switch', async ({
    page,
    request,
  }) => {
    const one = await createList(request, uniqueName('Focus one'), 'wishlist')
    const two = await createList(request, uniqueName('Focus two'), 'wishlist')
    await page.goto(`/lists/${one.id}`)
    const panel = itemPanel(page)
    const title = panel.getByRole('textbox', { name: 'Title' })

    for (const name of [uniqueName('A'), uniqueName('B')]) {
      await page.getByRole('button', { name: 'New item' }).first().click({ force: true })
      await expect(title).toBeFocused()
      await titleIsActive(page)
      await title.fill(name)
      await title.press('Enter')
      await expect(panel.getByRole('heading', { name })).toBeVisible()
    }
    // New item again while the draft is already open.
    await page.getByRole('button', { name: 'New item' }).first().click({ force: true })
    await expect(title).toBeFocused()
    await page.getByRole('button', { name: 'New item' }).first().click({ force: true })
    await expect(title).toBeFocused()
    await titleIsActive(page)

    await page.goto(`/lists/${two.id}`)
    await page.getByRole('button', { name: 'New item' }).first().click({ force: true })
    await expect(title).toBeFocused()
    await titleIsActive(page)
  })

  test('Quick add focuses its title on every open, also after an add', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Quick focus'), 'wishlist')
    await page.goto(`/lists/${list.id}`)
    for (const name of [uniqueName('Q1'), uniqueName('Q2')]) {
      await page.getByRole('button', { name: 'Quick add' }).first().click({ force: true })
      const dialog = page.getByRole('dialog', { name: 'Quick add' })
      const title = dialog.getByRole('textbox', { name: 'Title' })
      await expect(title).toBeFocused()
      await titleIsActive(page)
      await title.fill(name)
      await title.press('Enter')
      await expect(dialog).toBeHidden()
      await expect(page.getByText(`Added “${name}”`, { exact: true })).toBeVisible()
    }
  })
})
