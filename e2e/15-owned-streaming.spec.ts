import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('F-022-W3 my streaming services', () => {
  test('ticking owned services in Settings hides the others on an item', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const list = await createList(request, uniqueName('Owned streaming'), 'movie')
    const item = await createItem(request, list.id, uniqueName('Film'), {
      metadata: { streaming: { country: 'IT', platforms: ['Netflix', 'Sky'] } },
    })
    try {
      await page.goto('/settings')
      const settings = page.getByRole('dialog', { name: 'Settings' })
      await settings.getByRole('button', { name: 'Media' }).click()
      await settings.getByRole('button', { name: 'My streaming services' }).click()
      await page.getByRole('menuitemcheckbox', { name: 'Netflix' }).click()
      await page.keyboard.press('Escape')
      await settings.getByRole('button', { name: 'Close' }).click()
      await expect(page.getByText('Settings saved', { exact: true })).toBeVisible()

      await expect
        .poll(
          async () =>
            (await (await request.get('/api/v1/settings')).json()).owned_streaming_services,
        )
        .toEqual(['netflix'])

      await page.goto(itemUrl(list.id, item.id))
      const panel = itemPanel(page)
      await expect(panel.getByRole('img', { name: 'Netflix' })).toBeVisible()
      await expect(panel.getByRole('img', { name: 'Sky' })).toHaveCount(0)
    } finally {
      // Back to the default (every service) so other specs see the shared workspace unchanged.
      const current = await (await request.get('/api/v1/settings')).json()
      const reset = await request.patch('/api/v1/settings', {
        headers: { 'If-Match': `"s-${current.version}"` },
        data: { owned_streaming_services: [] },
      })
      expect(reset.status()).toBe(200)
    }
  })
})
