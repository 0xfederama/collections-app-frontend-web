import { expect, test, type Page } from '@playwright/test'
import { createItem, createList, uniqueName } from './helpers'

// Roadmap 36 (web 3.4.0, D-160): the Movies list "…" menu has "Movie Vector Map" (new tab) and
// "Pick a random movie". Runs on desktop (chromium, 1440 px: the item opens in the panel) and on the
// phone (mobile-webkit: the list stays, the banner offers Open). Set SHOTS_DIR to save screenshots.

const MOVIES = ['Alien', 'Heat', 'Ran', 'Brazil', 'Fargo', 'Rocky', 'Jaws', 'Psycho']
const shot = async (page: Page, name: string) => {
  const dir = process.env.SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${test.info().project.name}-${name}.png` })
}
const openMenu = async (page: Page, name: string) => {
  await page
    .getByRole('main')
    .getByRole('button', { name: `More actions for ${name}` })
    .click()
}

test.describe('roadmap 36 movie list extras', () => {
  test('the map link opens a new tab, the pick follows the search', async ({ page, request }) => {
    const name = uniqueName('Watchlist')
    const list = await createList(request, name, 'movie')
    const suffix = name.split(' ').at(-1) ?? ''
    for (const [index, title] of MOVIES.entries()) {
      await createItem(request, list.id, `${title} ${suffix}`, {
        metadata: { release_year: 1975 + index, runtime_minutes: 90 + index * 7 },
      })
    }
    await page.goto(`/lists/${list.id}`)
    const rows = page.getByRole('list', { name: 'Items' }).getByRole('listitem')
    await expect(rows).toHaveCount(MOVIES.length)

    await openMenu(page, name)
    const map = page.getByRole('menuitem', { name: /Movie Vector Map/ })
    await expect(map).toHaveAttribute('href', 'https://mikeyguinness.com/movies/')
    await expect(map).toHaveAttribute('target', '_blank')
    await expect(map).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(page.getByRole('menuitem', { name: 'Pick a random movie' })).toBeEnabled()
    await shot(page, 'menu')

    await page.getByRole('menuitem', { name: 'Pick a random movie' }).click()
    const status = page.getByRole('status').filter({ hasText: /^Random pick: / })
    await expect(status).toHaveCount(1)
    const first = ((await status.textContent()) ?? '').replace('Random pick: ', '')
    expect(MOVIES.map((title) => `${title} ${suffix}`)).toContain(first)
    await expect(page.locator('li[data-picked]')).toContainText(first)
    await expect(rows.filter({ hasText: first })).toBeInViewport()
    await shot(page, 'pick')

    const wide = (page.viewportSize()?.width ?? 0) >= 1280
    if (wide) {
      // A tap at this width opens the item in the panel beside the list.
      await expect(
        page.getByRole('complementary', { name: 'Item details' }).getByRole('heading', {
          name: first,
        }),
      ).toBeVisible()
    }

    await page.getByRole('button', { name: 'Pick another' }).click()
    await expect(status).not.toHaveText(`Random pick: ${first}`)
    const second = ((await status.textContent()) ?? '').replace('Random pick: ', '')

    if (!wide) {
      await page.getByRole('button', { name: 'Open', exact: true }).click()
      await expect(page.getByRole('heading', { name: second, level: 1 })).toBeVisible()
      await page.goBack()
    }

    // With a search, the pick only sees the rows that match.
    await page.goto(`/lists/${list.id}?q=${encodeURIComponent(`Heat ${suffix}`)}`)
    await expect(rows).toHaveCount(1)
    await openMenu(page, name)
    await page.getByRole('menuitem', { name: 'Pick a random movie' }).click()
    await expect(status).toHaveText(`Random pick: Heat ${suffix}`)
    await expect(page.getByRole('button', { name: 'Pick another' })).toHaveCount(0)

    // Nothing shown: disabled, with the reason.
    await page.goto(`/lists/${list.id}?q=zz-no-movie-${suffix}`)
    await expect(page.getByText('No items match')).toBeVisible()
    await openMenu(page, name)
    const pick = page.getByRole('menuitem', { name: /Pick a random movie/ })
    await expect(pick).toHaveAttribute('aria-disabled', 'true')
    await expect(pick).toContainText('No movies shown')
  })

  test('other list types have neither entry', async ({ page, request }) => {
    const name = uniqueName('Books')
    const list = await createList(request, name, 'book')
    await createItem(request, list.id, uniqueName('Dune'))
    await page.goto(`/lists/${list.id}`)
    await openMenu(page, name)
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Pick a random/ })).toHaveCount(0)
    await expect(page.getByRole('menuitem', { name: /Movie Vector Map/ })).toHaveCount(0)
  })
})
