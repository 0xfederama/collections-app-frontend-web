import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { createList, sidebarTree, uniqueName } from './helpers'

async function expectNoSeriousIssues(page: Page) {
  // Dialogs fade in: axe reads the blended colour of text that is still partly transparent, so
  // it reports a false contrast failure. Scan only once every animation has finished.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  )
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(serious.map((violation) => `${violation.id} (${violation.impact})`)).toEqual([])
}

const SEARCH = 'Search icons and emoji'

/** The popover is a plain Radix popover (no dialog): find it by its search field. */
const popoverOf = (page: Page) => page.locator('[data-radix-popper-content-wrapper]').last()

test.describe('F012-W1 list icons (popover)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: create with an icon and colour, change to emoji, then remove`, async ({
      page,
      request,
    }) => {
      const name = uniqueName('Icon list')
      await page.addInitScript((value) => localStorage.setItem('collection:theme', value), theme)
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
      const sidebarNew = page.getByRole('button', { name: 'New', exact: true })
      const firstList = page
        .getByRole('main')
        .getByRole('button', { name: 'New list', exact: true })
      await expect(sidebarNew.or(firstList).first()).toBeVisible()
      if (await sidebarNew.isVisible()) {
        await sidebarNew.click()
        await page.getByRole('menuitem', { name: 'List', exact: true }).click()
      } else {
        await firstList.click()
      }
      const create = page.getByRole('dialog', { name: 'New list' })
      await create.getByRole('textbox', { name: 'Name' }).fill(name)
      await create.getByRole('button', { name: 'Choose icon' }).click()
      await page.getByRole('textbox', { name: SEARCH }).fill('camer')
      await expectNoSeriousIssues(page)
      // Picking an icon applies and closes the popover; the colour is a swatch away.
      await page.getByRole('button', { name: 'camera', exact: true }).click()
      await expect(page.getByRole('textbox', { name: SEARCH })).toBeHidden()
      await create.getByRole('button', { name: 'Choose icon' }).click()
      await page.getByRole('button', { name: 'Icon color', exact: true }).click()
      await page.getByRole('button', { name: 'Indigo', exact: true }).click()
      await expect(page.getByRole('textbox', { name: SEARCH })).toBeVisible()
      await page.keyboard.press('Escape')
      await create.getByRole('button', { name: 'Create' }).click()

      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      const treeBody = (await (await request.get('/api/v1/tree')).json()) as {
        lists: { id: string; name: string; icon: string | null; icon_color: string | null }[]
      }
      const saved = treeBody.lists.find((list) => list.name === name)
      expect(saved).toMatchObject({ icon: 'i:camera', icon_color: 'indigo' })
      if (!saved) throw new Error('The created list is missing from the tree.')
      const read = async () =>
        (await (await request.get(`/api/v1/lists/${saved.id}`)).json()) as {
          icon: string | null
          icon_color: string | null
        }

      // Header: the Emoji tab, one tap applies.
      const headerIcon = page
        .getByRole('main')
        .getByRole('button', { name: 'Change icon', exact: true })
      await headerIcon.click()
      await expect(page.getByRole('textbox', { name: SEARCH })).toBeFocused()
      await expectNoSeriousIssues(page)
      await page.getByRole('tab', { name: 'Emoji' }).click()
      await page.getByRole('button', { name: '📷 camera', exact: true }).click()
      await expect(page.getByRole('textbox', { name: SEARCH })).toBeHidden()
      await expect.poll(read).toMatchObject({ icon: '📷', icon_color: null })

      // Someone else changes the list while the popover is open: 412, nothing is overwritten.
      await headerIcon.click()
      const external = await request.patch(`/api/v1/lists/${saved.id}`, {
        headers: { 'If-Match': `"l-${await currentVersion(request, saved.id)}"` },
        data: { name: `${name} updated elsewhere` },
      })
      expect(external.status()).toBe(200)
      await page.getByRole('tab', { name: 'Icons' }).click()
      await page.getByRole('textbox', { name: SEARCH }).fill('camer')
      await page.getByRole('button', { name: 'camera', exact: true }).click()
      const alert = popoverOf(page).getByRole('alert')
      await expect(alert).toContainText('Someone else changed this list')
      await expect(page.getByRole('textbox', { name: SEARCH })).toBeVisible()
      await expect.poll(read).toMatchObject({ icon: '📷' })
      await alert.getByRole('button', { name: 'Reload latest' }).click()
      await expect(alert).toBeHidden()
      await page.getByRole('button', { name: 'camera', exact: true }).click()
      await expect.poll(read).toMatchObject({ icon: 'i:camera' })

      // Remove goes back to the type's default icon.
      await headerIcon.click()
      await page.getByRole('button', { name: 'Remove', exact: true }).click()
      await expect.poll(read).toMatchObject({ icon: null, icon_color: null })
    })
  }

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [375, 1440] as const) {
      test(`${theme} at ${width}px: popover fits the viewport, touch-sized, accessible`, async ({
        browser,
        request,
      }) => {
        const name = uniqueName('Responsive icon list')
        const context = await browser.newContext({
          viewport: { width, height: 800 },
          hasTouch: width === 375,
        })
        const page = await context.newPage()
        await page.addInitScript((value) => localStorage.setItem('collection:theme', value), theme)
        const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5183'
        const created = await createList(request, name)
        await page.goto(new URL(`/lists/${created.id}`, baseUrl).toString())
        await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
        await page
          .getByRole('main')
          .getByRole('button', { name: 'Change icon', exact: true })
          .click()
        const search = page.getByRole('textbox', { name: SEARCH })
        await expect(search).toBeVisible()
        const box = await popoverOf(page).boundingBox()
        if (!box) throw new Error('The popover must be visible.')
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true)
        const camera = page.getByRole('button', { name: 'camera', exact: true })
        await expect
          .poll(async () => (await camera.boundingBox())?.width ?? 0)
          .toBeGreaterThanOrEqual(40)
        await expectNoSeriousIssues(page)
        // Esc closes and gives the focus back to the icon button.
        await page.keyboard.press('Escape')
        await expect(search).toBeHidden()
        await expect(
          page.getByRole('main').getByRole('button', { name: 'Change icon', exact: true }),
        ).toBeFocused()
        await context.close()
      })
    }
  }
})

test.describe('F018-W1 list icon edit from the header and the sidebar row', () => {
  test('change the icon from the header icon button, then from the sidebar row menu', async ({
    page,
    request,
  }) => {
    const name = uniqueName('Edit icon list')
    const list = await createList(request, name, 'movie')
    await page.goto(`/lists/${list.id}`)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()

    // The header icon is a keyboard-reachable button named "Change icon".
    const headerIcon = page
      .getByRole('main')
      .getByRole('button', { name: 'Change icon', exact: true })
    await headerIcon.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('textbox', { name: SEARCH }).fill('camer')
    await page.getByRole('button', { name: 'camera', exact: true }).click()
    await expect(page.getByRole('textbox', { name: SEARCH })).toBeHidden()
    await expect
      .poll(async () => (await (await request.get(`/api/v1/lists/${list.id}`)).json()).icon)
      .toBe('i:camera')

    // The sidebar row menu offers the same popover, beside the row.
    await sidebarTree(page)
      .getByRole('button', { name: `More actions for ${name}`, exact: true })
      .click()
    await page.getByRole('menuitem', { name: 'Change icon', exact: true }).click()
    await expect(page.getByRole('textbox', { name: SEARCH })).toBeFocused()
    await page.getByRole('tab', { name: 'Emoji' }).click()
    await page.getByRole('button', { name: '📷 camera', exact: true }).click()
    await expect
      .poll(async () => (await (await request.get(`/api/v1/lists/${list.id}`)).json()).icon)
      .toBe('📷')
  })
})

async function currentVersion(request: APIRequestContext, id: string) {
  const response = await request.get(`/api/v1/lists/${id}`)
  return ((await response.json()) as { version: number }).version
}

test.describe('F019 list title', () => {
  test('click the title to rename it; the sidebar follows', async ({ page, request }) => {
    const name = uniqueName('Title list')
    const renamed = `${name} renamed`
    const list = await createList(request, name)
    await page.goto(`/lists/${list.id}`)
    await page.getByRole('main').getByRole('button', { name, exact: true }).click()
    const field = page.getByRole('textbox', { name: 'List name' })
    await field.fill(renamed)
    await field.press('Enter')
    await expect(
      page.getByRole('main').getByRole('button', { name: renamed, exact: true }),
    ).toBeVisible()
    await expect(
      sidebarTree(page).getByRole('treeitem', { name: new RegExp(renamed) }),
    ).toBeVisible()
  })
})
