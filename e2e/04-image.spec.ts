import { expect, test } from '@playwright/test'
import { createItem, createList, itemPanel, itemUrl, uniqueName } from './helpers'

test.describe('AT-06 item image', () => {
  test('a rejected file shows its error, a JPEG uploads and shows its thumbnail', async ({
    page,
    request,
  }) => {
    const list = await createList(request, uniqueName('Pics'), 'generic')
    const title = uniqueName('Photo')
    const item = await createItem(request, list.id, title)
    await page.goto(itemUrl(list.id, item.id))
    const panel = itemPanel(page)
    await panel.getByRole('button', { name: 'Add image' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add image' })
    const chooser = dialog.getByLabel('Choose an image file')
    const alert = dialog.getByRole('alert').filter({ hasText: /SVG|JPEG|rejected/ })

    // Refused by the client (SVG).
    await chooser.setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    })
    await expect(alert).toContainText('SVG')

    // A text file renamed .jpg gets past the client and is refused by the server.
    await chooser.setInputFiles({
      name: 'notes.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('this is not an image'),
    })
    await expect(alert).toContainText(/not a JPEG, PNG or WebP image|rejected/)

    // A real JPEG, drawn by the browser itself so no binary is committed.
    const base64 = await page.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 48
      canvas.height = 32
      const context = canvas.getContext('2d')!
      context.fillStyle = '#336699'
      context.fillRect(0, 0, 48, 32)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg'))
      const bytes = new Uint8Array(await blob!.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    })
    await chooser.setInputFiles({
      name: 'pic.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(base64, 'base64'),
    })
    const thumbnail = panel.getByRole('img', { name: title })
    await expect(thumbnail).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect
      .poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0)
    await expect(panel.getByRole('button', { name: 'Change image' })).toBeVisible()
  })
})
