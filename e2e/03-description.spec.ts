import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('F003-W1 description: edit in place, save, history restore', () => {
  test('write Markdown in place, save twice, restore the first version', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Notes'), 'generic')
    const item = await createItem(request, list.id, uniqueName('Doc'))
    await page.goto(itemUrl(list.id, item.id))

    const panel = itemPanel(page)
    const editor = panel.getByRole('textbox', { name: 'Description (Markdown)' })
    const save = panel.getByRole('button', { name: 'Save description' })

    await panel.getByRole('button', { name: 'Click to start writing' }).click()
    await expect(editor).toBeFocused()
    await page.keyboard.type('# First heading')
    await save.click()
    await expect(panel.getByRole('heading', { name: 'First heading' })).toBeVisible()

    await panel.getByRole('button', { name: 'Edit description' }).click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('Second text')
    await page.keyboard.press('ControlOrMeta+Enter')
    await expect(panel.getByText('Second text')).toBeVisible()

    await panel.getByRole('button', { name: 'History' }).click()
    const history = page.getByRole('dialog', { name: 'History' })
    // Newest first: the first row is the current version, the next one holds the first text.
    await history.getByRole('list', { name: 'Versions' }).getByRole('button').nth(1).click()
    await expect(history.getByRole('heading', { name: 'First heading' })).toBeVisible()
    await history.getByRole('button', { name: 'Restore this version' }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Restore this version' })
      .click()
    await expect(history).toBeHidden()
    await expect(panel.getByRole('heading', { name: 'First heading' })).toBeVisible()
  })
})
