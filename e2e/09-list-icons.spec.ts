import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
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

async function openIconPicker(page: Page) {
  await page.getByRole('button', { name: 'Choose icon' }).click()
  const picker = page.getByRole('dialog', { name: 'Choose list icon' })
  await expect(picker.getByRole('textbox', { name: 'Search icons and emoji' })).toBeVisible()
  return picker
}

test.describe('F012-W1 list icons', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: create, edit to emoji, and reset a list icon`, async ({ page, request }) => {
      const name = uniqueName('Icon list')
      let currentName = name
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
      const picker = await openIconPicker(page)
      await picker.getByRole('textbox', { name: 'Search icons and emoji' }).fill('camer')
      await picker.getByRole('button', { name: 'camera', exact: true }).click()
      await picker.getByRole('button', { name: 'Indigo' }).click()
      await expectNoSeriousIssues(page)
      await picker.getByRole('button', { name: 'Done' }).click()
      await create.getByRole('button', { name: 'Create' }).click()

      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      const tree = await request.get('/api/v1/tree')
      const treeBody = (await tree.json()) as {
        lists: { id: string; name: string; icon: string | null; icon_color: string | null }[]
      }
      const saved = treeBody.lists.find((list) => list.name === name)
      expect(saved).toMatchObject({ icon: 'i:camera', icon_color: 'indigo' })
      if (!saved) throw new Error('The created list is missing from the tree.')

      await page.getByRole('main').getByRole('button', { name: 'Change icon', exact: true }).click()
      const settings = page.getByRole('dialog', { name: `List icon · ${currentName}` })
      const editPicker = await openIconPicker(page)
      await expectNoSeriousIssues(page)
      await editPicker.getByRole('textbox', { name: 'Use an emoji' }).fill('🪿')
      await editPicker.getByRole('button', { name: 'Use emoji' }).click()
      await editPicker.getByRole('button', { name: 'Done' }).click()
      const externalName = `${name} updated elsewhere`
      const external = await request.patch(`/api/v1/lists/${saved.id}`, {
        headers: { 'If-Match': '"l-1"' },
        data: { name: externalName },
      })
      expect(external.status()).toBe(200)
      await settings.getByRole('button', { name: 'Save' }).click()
      await expect(settings.getByRole('button', { name: 'Reload latest' })).toBeVisible()
      await settings.getByRole('button', { name: 'Reload latest' }).click()
      const reloadConfirmation = page.getByRole('alertdialog', {
        name: 'Replace your unsaved changes with the latest list icon?',
      })
      await expect(reloadConfirmation).toBeVisible()
      await reloadConfirmation.getByRole('button', { name: 'Keep my draft' }).click()
      await expect(settings.getByRole('button', { name: 'Copy my draft' })).toBeVisible()
      await settings.getByRole('button', { name: 'Reload latest' }).click()
      await page
        .getByRole('alertdialog', {
          name: 'Replace your unsaved changes with the latest list icon?',
        })
        .getByRole('button', { name: 'Reload latest' })
        .click()
      currentName = externalName
      const latestSettings = page.getByRole('dialog', { name: `List icon · ${currentName}` })
      await expect(latestSettings.getByText('camera', { exact: true })).toBeVisible()
      await latestSettings.getByRole('button', { name: 'Save' }).click()
      await expect(latestSettings).toBeHidden()
      let response = await request.get(`/api/v1/lists/${saved.id}`)
      let body = (await response.json()) as { icon: string | null; icon_color: string | null }
      expect(body).toMatchObject({ icon: 'i:camera', icon_color: 'indigo' })

      await page.getByRole('main').getByRole('button', { name: 'Change icon', exact: true }).click()
      const emojiSettings = page.getByRole('dialog', { name: `List icon · ${currentName}` })
      const emojiPicker = await openIconPicker(page)
      await emojiPicker.getByRole('textbox', { name: 'Use an emoji' }).fill('🪿')
      await emojiPicker.getByRole('button', { name: 'Use emoji' }).click()
      await emojiPicker.getByRole('button', { name: 'Done' }).click()
      await emojiSettings.getByRole('button', { name: 'Save' }).click()
      await expect(emojiSettings).toBeHidden()
      response = await request.get(`/api/v1/lists/${saved.id}`)
      body = (await response.json()) as { icon: string | null; icon_color: string | null }
      expect(body).toMatchObject({ icon: '🪿', icon_color: null })

      await page.getByRole('main').getByRole('button', { name: 'Change icon', exact: true }).click()
      const reset = page.getByRole('dialog', { name: `List icon · ${currentName}` })
      await openIconPicker(page)
      const resetPicker = page.getByRole('dialog', { name: 'Choose list icon' })
      await resetPicker.getByRole('button', { name: 'Use default' }).click()
      await resetPicker.getByRole('button', { name: 'Done' }).click()
      await reset.getByRole('button', { name: 'Save' }).click()
      await expect(reset).toBeHidden()
      response = await request.get(`/api/v1/lists/${saved.id}`)
      body = (await response.json()) as { icon: string | null; icon_color: string | null }
      expect(body).toMatchObject({ icon: null, icon_color: null })
    })
  }

  for (const theme of ['light', 'dark'] as const) {
    for (const width of [375, 1440] as const) {
      test(`${theme} at ${width}px: picker is responsive, touch-sized, and accessible`, async ({
        browser,
        request,
      }) => {
        const name = uniqueName('Responsive icon list')
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          hasTouch: width === 375,
        })
        const page = await context.newPage()
        await page.addInitScript((value) => localStorage.setItem('collection:theme', value), theme)
        const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5183'
        await page.goto(new URL('/', baseUrl).toString())
        await page.getByRole('button', { name: 'New', exact: true }).click()
        await page.getByRole('menuitem', { name: 'List', exact: true }).click()
        const create = page.getByRole('dialog', { name: 'New list' })
        const nameLabel = create.getByText('Name', { exact: true })
        const iconLabel = create.getByText('Icon', { exact: true })
        const nameInput = create.getByRole('textbox', { name: 'Name' })
        const iconButton = create.getByRole('button', { name: 'Choose icon' })
        const [nameLabelBox, iconLabelBox, nameInputBox, iconButtonBox] = await Promise.all([
          nameLabel.boundingBox(),
          iconLabel.boundingBox(),
          nameInput.boundingBox(),
          iconButton.boundingBox(),
        ])
        expect(nameLabelBox).not.toBeNull()
        expect(iconLabelBox).not.toBeNull()
        expect(nameInputBox).not.toBeNull()
        expect(iconButtonBox).not.toBeNull()
        if (!nameLabelBox || !iconLabelBox || !nameInputBox || !iconButtonBox) {
          throw new Error('The new-list name and icon controls must be visible.')
        }
        expect(iconLabelBox.y).toBe(nameLabelBox.y)
        expect(iconButtonBox.x).toBeGreaterThanOrEqual(nameInputBox.x + nameInputBox.width)
        expect(
          Math.abs(
            iconButtonBox.y + iconButtonBox.height / 2 - (nameInputBox.y + nameInputBox.height / 2),
          ),
        ).toBeLessThanOrEqual(3)
        await create.getByRole('button', { name: 'Cancel' }).click()

        const created = await createList(request, name)
        await page.goto(new URL(`/lists/${created.id}`, baseUrl).toString())
        await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
        await page
          .getByRole('main')
          .getByRole('button', { name: 'Change icon', exact: true })
          .click()
        const picker = await openIconPicker(page)
        await picker.getByRole('button', { name: 'Show all icons' }).click()
        const iconGrid = picker.locator('section[aria-label="Built-in icons"] > div')
        const columnCount = await iconGrid.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
        )
        expect(columnCount).toBe(width === 375 ? 4 : 8)
        await expectNoSeriousIssues(page)

        if (width === 375) {
          const camera = picker.getByRole('button', { name: 'camera', exact: true })
          await expect
            .poll(async () => (await camera.boundingBox())?.width ?? 0)
            .toBeGreaterThanOrEqual(44)
          await camera.click()
          const swatch = picker.getByRole('button', { name: 'Indigo' })
          await expect
            .poll(async () => (await swatch.boundingBox())?.width ?? 0)
            .toBeGreaterThanOrEqual(44)
        }

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
    const headerDialog = page.getByRole('dialog', { name: `List icon · ${name}` })
    const headerPicker = await openIconPicker(page)
    await expectNoSeriousIssues(page)
    await headerPicker.getByRole('textbox', { name: 'Search icons and emoji' }).fill('camer')
    await headerPicker.getByRole('button', { name: 'camera', exact: true }).click()
    await headerPicker.getByRole('button', { name: 'Done' }).click()
    await headerDialog.getByRole('button', { name: 'Save' }).click()
    await expect(headerDialog).toBeHidden()
    let response = await request.get(`/api/v1/lists/${list.id}`)
    expect(await response.json()).toMatchObject({ icon: 'i:camera' })

    // The sidebar row menu offers the same dialog, with the same save.
    await sidebarTree(page)
      .getByRole('button', { name: `More actions for ${name}`, exact: true })
      .click()
    await page.getByRole('menuitem', { name: 'Change icon', exact: true }).click()
    const rowDialog = page.getByRole('dialog', { name: `List icon · ${name}` })
    const rowPicker = await openIconPicker(page)
    await rowPicker.getByRole('textbox', { name: 'Use an emoji' }).fill('🪿')
    await rowPicker.getByRole('button', { name: 'Use emoji' }).click()
    await rowPicker.getByRole('button', { name: 'Done' }).click()
    await rowDialog.getByRole('button', { name: 'Save' }).click()
    await expect(rowDialog).toBeHidden()
    response = await request.get(`/api/v1/lists/${list.id}`)
    expect(await response.json()).toMatchObject({ icon: '🪿', icon_color: null })
  })
})

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
