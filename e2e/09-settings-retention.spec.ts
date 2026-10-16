import { expect, test } from '@playwright/test'

test('F012-W4 saves trash retention immediately', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/settings')
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const retention = settings.getByRole('combobox', { name: 'Delete trash automatically' })
  await expect(retention).toHaveText('Off')
  await retention.click()
  await page.getByRole('option', { name: '7 days' }).click()
  await expect(page.getByText('Trash retention saved', { exact: true })).toBeVisible()
  await expect(retention).toHaveText('7 days')

  const response = await request.get('/api/v1/settings')
  expect((await response.json()).trash_retention_days).toBe(7)

  await retention.click()
  await page.getByRole('option', { name: 'Off' }).click()
  await expect(retention).toHaveText('Off')
  await expect
    .poll(async () => (await (await request.get('/api/v1/settings')).json()).trash_retention_days)
    .toBeNull()
})
