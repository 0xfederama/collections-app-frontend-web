import { expect, test, type Page } from '@playwright/test'
import { createItem, createList, uniqueName, type ItemType } from './helpers'

// web 2.29.1: every sort of movie, TV and book lists loads (a user once saw "Couldn't load the
// items" after choosing one), and the "make default" offer sits on its own line under the toolbar.
const seeds: Record<string, object[]> = {
  movie: [
    {
      release_year: 1999,
      runtime_minutes: 136,
      director: 'Lana Wachowski',
      streaming: { country: 'IT', platforms: ['netflix'] },
    },
    { release_year: 2010, runtime_minutes: 148, director: 'Christopher Nolan' },
    {},
  ],
  tv_show: [
    {
      first_air_year: 2008,
      end_year: 2013,
      seasons: 5,
      episodes_per_season: 13,
      episode_minutes: 47,
    },
    { first_air_year: 2016, seasons: 4, streaming: { country: 'IT', platforms: ['netflix'] } },
    {},
  ],
  book: [
    { author: 'Frank Herbert', pages: 412, isbn: '9780441172719' },
    { author: 'Jane Austen', pages: 279 },
    {},
  ],
}

async function sortOptions(page: Page) {
  await page.getByRole('button', { name: 'Sort', exact: true }).click()
  const labels = await page.getByRole('menuitemradio').allTextContents()
  await page.keyboard.press('Escape')
  return labels
}

for (const type of ['movie', 'tv_show', 'book'] as const) {
  test(`every sort of a ${type} list loads its items`, async ({ page, request }) => {
    const list = await createList(request, uniqueName(`Sorts ${type}`), type as ItemType)
    for (const [i, metadata] of seeds[type]!.entries()) {
      await createItem(request, list.id, `Item ${i} ${uniqueName('x')}`, { metadata })
    }
    await page.goto(`/lists/${list.id}`)
    await expect(page.getByRole('link', { name: /Item 0/ }).first()).toBeVisible()
    const labels = await sortOptions(page)
    expect(labels.length).toBeGreaterThan(3)
    for (const label of labels) {
      await page.getByRole('button', { name: 'Sort', exact: true }).click()
      await page.getByRole('menuitemradio', { name: label, exact: true }).click()
      await expect(page.getByRole('link', { name: /Item 0/ }).first()).toBeVisible()
      await expect(page.getByText('Couldn’t load the items')).toHaveCount(0)
    }
  })
}

test('a different sort offers to become the default, on its own line, then the line goes', async ({
  page,
  request,
}) => {
  const list = await createList(request, uniqueName('Default sort'), 'book')
  await createItem(request, list.id, uniqueName('Book'))
  await page.goto(`/lists/${list.id}`)
  const sort = page.getByRole('button', { name: 'Sort', exact: true })
  await sort.click()
  await page.getByRole('menuitemradio', { name: 'Title', exact: true }).click()
  const offer = page.getByRole('button', { name: 'Make “Title” the default sort for this list' })
  await expect(offer).toBeVisible()
  // Below the toolbar row, not inside it.
  const offerBox = await offer.boundingBox()
  const sortBox = await sort.boundingBox()
  expect(offerBox!.y).toBeGreaterThan(sortBox!.y + sortBox!.height)
  await offer.click()
  await expect(page.getByText('Default sort saved', { exact: true })).toBeVisible()
  await expect(offer).toHaveCount(0)
})
