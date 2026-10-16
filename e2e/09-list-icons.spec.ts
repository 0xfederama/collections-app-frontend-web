import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { uniqueName } from './helpers'

async function expectNoSeriousIssues(page: Page) {
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
      const firstList = page.getByRole('main').getByRole('button', { name: 'New list', exact: true })
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

      await page.getByRole('button', { name: `More actions for ${currentName}` }).click()
      await page.getByRole('menuitem', { name: 'List icon…' }).click()
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
      await settings.getByRole('button', { name: 'Save' }).click()
      await expect(settings).toBeHidden()
      currentName = externalName
      let response = await request.get(`/api/v1/lists/${saved.id}`)
      let body = (await response.json()) as { icon: string | null; icon_color: string | null }
      expect(body).toMatchObject({ icon: '🪿', icon_color: null })

      await page.getByRole('button', { name: `More actions for ${currentName}` }).click()
      await page.getByRole('menuitem', { name: 'List icon…' }).click()
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
})
