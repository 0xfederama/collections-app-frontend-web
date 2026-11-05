import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

// F-026 W5: the item's back control goes to its list (keeping ?q= and ?sort=). The list has the
// "Back to Home" button only on phones (F-025 W14); from 768 px Home is the sidebar. Runs in `chromium`.

test.describe('F-026 W5 back controls', () => {
  test('closing the item panel at 1440 returns to its list with the sort kept', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Panel back'), 'movie')
    const item = await createItem(request, list.id, uniqueName('Panel film'))
    await page.goto(`${itemUrl(list.id, item.id)}?sort=title`)
    await itemPanel(page).getByRole('button', { name: 'Close details' }).click()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}\\?sort=title$`))
  })

  test('at 1024 the item page back link goes to its list with the search kept', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    const list = await createList(request, uniqueName('Text back'), 'movie')
    const item = await createItem(request, list.id, uniqueName('Text film'))
    await page.goto(`${itemUrl(list.id, item.id)}?q=Text&sort=title`)
    await page
      .getByRole('main')
      .getByRole('link', { name: /^← Back to / })
      .click()
    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}\\?q=Text&sort=title$`))
  })

  test('at 1024 a list has no Back to Home button (Home is the sidebar)', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    const list = await createList(request, uniqueName('Desk list'), 'movie')
    await page.goto(`/lists/${list.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back to Home' })).toHaveCount(0)
  })
})
