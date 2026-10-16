import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../../app/router'
import { ToastProvider } from '../../../components/ui'
import { exampleResponses } from '../../../generated/examples'
import { problemResponse } from '../../../mocks/problems'
import { server } from '../../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../../test-utils'
import type { Item } from '../api'
import { MAX_IMAGE_BYTES } from './checks'

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const itemUrl = `${location.origin}/api/v1/items/${ITEM}`
const imageUrl = `${itemUrl}/image`

const matrix = exampleResponses.getItem.body as Item

const uploaded: NonNullable<Item['image']> = {
  source: 'upload',
  attachment_id: '7c1e5a10-0000-4000-8000-0000000009a1',
  url: '/api/v1/attachments/7c1e5a10-0000-4000-8000-0000000009a1/file',
  thumbnail_url: '/api/v1/attachments/7c1e5a10-0000-4000-8000-0000000009a1/thumbnail',
  width: 800,
  height: 600,
  original_filename: 'cover.png',
}
const fromUrl: NonNullable<Item['image']> = {
  source: 'url',
  url: 'https://example.com/photo.jpg',
}

function renderForm() {
  mockViewport(1100)
  const router = createTestRouter([PATH])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

/** Opens the item and the image dialog ("Add image" when it has none, else "Change image"). */
async function openForm(item: Partial<Item> = { image: null }) {
  server.use(http.get(itemUrl, () => HttpResponse.json({ ...matrix, ...item })))
  renderForm()
  const user = userEvent.setup()
  await screen.findByRole('heading', { level: 1, name: 'The Matrix' })
  await user.click(
    await screen.findByRole('button', { name: item.image ? 'Change image' : 'Add image' }),
  )
  await screen.findByRole('dialog')
  return { user }
}

interface Call {
  method: string
  ifMatch: string | null
  contentType: string | null
  body: unknown
  /** Filename of the multipart `file` part (jsdom's File and undici's differ, so formData() cannot parse it). */
  fileName?: string
}

/** Records PUT/DELETE on the image endpoint; `respond` builds the answer (default: bumped version). */
function mockImage(respond?: (call: Call, n: number) => Response | Promise<Response>) {
  const calls: Call[] = []
  const handle = async ({ request }: { request: Request }) => {
    const contentType = request.headers.get('Content-Type')
    const call: Call = {
      method: request.method,
      ifMatch: request.headers.get('If-Match'),
      contentType,
      body: undefined,
    }
    if (contentType?.includes('application/json')) call.body = await request.json()
    else if (contentType?.includes('multipart/form-data')) {
      const raw = await request.text()
      call.fileName = /name="file"; filename="([^"]*)"/.exec(raw)?.[1]
    }
    calls.push(call)
    if (respond) return respond(call, calls.length)
    const image =
      request.method === 'DELETE'
        ? null
        : call.fileName
          ? uploaded
          : { source: 'url' as const, url: (call.body as { url: string }).url }
    return HttpResponse.json({ ...matrix, image, version: matrix.version + 1 })
  }
  server.use(http.put(imageUrl, handle), http.delete(imageUrl, handle))
  return calls
}

const png = (name = 'cover.png', size?: number) => {
  const f = new File(['\x89PNG'], name, { type: 'image/png' })
  if (size !== undefined) Object.defineProperty(f, 'size', { value: size })
  return f
}
const fileInput = () => screen.getByLabelText('Choose an image file') as HTMLInputElement
const browse = () => screen.getByRole('button', { name: 'browse' })
const urlField = () => screen.getByLabelText('Image URL')

/** The file input has `accept`; userEvent filters by it, so drive it with applyAccept off. */
async function choose(file: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(fileInput(), file)
}

describe('AT-06 image upload', () => {
  it('uploads a pasted clipboard file through the standard image upload path', async () => {
    const calls = mockImage()
    server.use(http.get(itemUrl, () => HttpResponse.json({ ...matrix, image: null })))
    mockViewport(1100)
    const router = createTestRouter([PATH])
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { level: 1, name: 'The Matrix' })
    const file = png('clipboard.png')
    fireEvent.paste(window, {
      clipboardData: {
        items: [{ kind: 'file', getAsFile: () => file }],
      } as unknown as DataTransfer,
    })
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'PUT', ifMatch: '"i-3"', fileName: 'clipboard.png' })
  })

  it('has a keyboard-reachable browse button and a restricted file input', async () => {
    const { user } = await openForm()
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(fileInput()).toHaveAttribute('type', 'file')
    expect(fileInput()).toHaveAttribute('tabindex', '-1')
    browse().focus()
    expect(browse()).toHaveFocus()
    expect(browse()).toBeEnabled()
    await user.tab()
    // Focus moves on to the URL field, not into the hidden input.
    expect(fileInput()).not.toHaveFocus()
    expect(screen.getByText('JPEG, PNG or WebP, up to 10 MiB.')).toBeInTheDocument()
  })

  it('rejects an SVG with an alert and sends no request', async () => {
    const calls = mockImage()
    await openForm()
    await choose(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('“logo.svg” is an SVG')
    expect(calls).toHaveLength(0)
  })

  it('rejects an 11 MiB file with an alert and sends no request', async () => {
    const calls = mockImage()
    await openForm()
    await choose(png('huge.png', 11 * 1024 * 1024))
    expect(await screen.findByRole('alert')).toHaveTextContent('“huge.png” is 11.0 MiB')
    expect(calls).toHaveLength(0)
  })

  it('accepts a file of exactly 10 MiB', async () => {
    const calls = mockImage()
    await openForm()
    await choose(png('edge.png', MAX_IMAGE_BYTES))
    await screen.findByText('Image uploaded')
    expect(calls).toHaveLength(1)
  })

  it('rejects several files at once', async () => {
    const calls = mockImage()
    await openForm()
    fireEvent.change(fileInput(), { target: { files: [png('a.png'), png('b.png')] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose one image at a time.')
    expect(calls).toHaveLength(0)
  })

  it('uploads a valid file as multipart with If-Match and toasts', async () => {
    const calls = mockImage()
    await openForm()
    await choose(png())
    expect(await screen.findByText('Image uploaded')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'PUT', ifMatch: '"i-3"' })
    expect(calls[0]?.fileName).toBe('cover.png')
    // The dialog closes and the picture itself shows the new image.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Change image' })).toBeInTheDocument()
  })

  it('shows a progress bar while uploading and Cancel upload aborts it', async () => {
    const calls = mockImage(async () => {
      await delay('infinite')
      return HttpResponse.json(matrix)
    })
    const { user } = await openForm()
    await choose(png())
    const bar = await screen.findByRole('progressbar', { name: 'Uploading cover.png' })
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')

    await user.click(screen.getByRole('button', { name: 'Cancel upload' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload cancelled')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText('Image uploaded')).not.toBeInTheDocument()
    expect(calls.length).toBeLessThanOrEqual(1)
    // The form is usable again.
    expect(browse()).toBeEnabled()
  })

  it.each([
    [415, 'unsupported_media_type', {}, 'The file is not a JPEG, PNG or WebP image.'],
    [413, 'payload_too_large', {}, 'The image is larger than 10 MiB.'],
    [
      422,
      'validation_failed',
      { errors: [{ field: 'file', message: 'is not a valid image' }] },
      'The image was rejected: is not a valid image.',
    ],
  ])('server %i is shown as a message and an error toast', async (status, code, extra, text) => {
    mockImage(() => problemResponse(status, code, extra))
    await openForm()
    await choose(png())
    expect(await screen.findByText('Image not changed')).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(screen.queryByText('Image uploaded')).not.toBeInTheDocument()
    // Not a conflict: no banner.
    expect(screen.queryByText(/Someone else changed this item while/)).not.toBeInTheDocument()
  })
})

describe('AT-07 image URL', () => {
  it('an empty address shows a field error and sends nothing', async () => {
    const calls = mockImage()
    const { user } = await openForm()
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))
    expect(await screen.findByText('Enter the address of an image.')).toBeInTheDocument()
    expect(urlField()).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toHaveLength(0)
  })

  it('an http address is rejected without a request, and typing clears the error', async () => {
    const calls = mockImage()
    const { user } = await openForm()
    await user.type(urlField(), 'http://example.com/a.jpg')
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))
    expect(await screen.findByText('The address must start with https://.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
    await user.type(urlField(), 'x')
    expect(screen.queryByText('The address must start with https://.')).not.toBeInTheDocument()
  })

  it('a garbage address is rejected without a request', async () => {
    const calls = mockImage()
    const { user } = await openForm()
    await user.type(urlField(), 'nonsense')
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))
    expect(await screen.findByText(/not a valid address/)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('an https address sends JSON { url } with If-Match, toasts and clears the field', async () => {
    const calls = mockImage()
    const { user } = await openForm()
    await user.type(urlField(), '  https://example.com/photo.jpg ')
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))
    expect(await screen.findByText('Image address saved')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.method).toBe('PUT')
    expect(calls[0]?.ifMatch).toBe('"i-3"')
    expect(calls[0]?.contentType).toContain('application/json')
    expect(calls[0]?.body).toEqual({ url: 'https://example.com/photo.jpg' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Enter in the URL field applies the address and does not submit the item form', async () => {
    const calls = mockImage()
    let patches = 0
    server.use(
      http.patch(itemUrl, () => {
        patches += 1
        return HttpResponse.json(matrix)
      }),
    )
    const { user } = await openForm()
    await user.type(urlField(), 'https://example.com/photo.jpg{Enter}')
    await screen.findByText('Image address saved')
    expect(calls).toHaveLength(1)
    expect(patches).toBe(0)
    expect(screen.getByRole('heading', { level: 1, name: 'The Matrix' })).toBeInTheDocument()
  })

  it('Enter on an invalid address shows the error and does not submit the item form', async () => {
    const calls = mockImage()
    let patches = 0
    server.use(
      http.patch(itemUrl, () => {
        patches += 1
        return HttpResponse.json(matrix)
      }),
    )
    const { user } = await openForm()
    await user.type(urlField(), 'http://nope.example{Enter}')
    expect(await screen.findByText('The address must start with https://.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
    expect(patches).toBe(0)
  })

  it('a server 422 on the URL is shown with the server message', async () => {
    mockImage(() =>
      problemResponse(422, 'validation_failed', {
        errors: [{ field: 'url', message: 'host is not allowed' }],
      }),
    )
    const { user } = await openForm()
    await user.type(urlField(), 'https://internal.example/a.jpg')
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The image address was rejected: host is not allowed.',
    )
    expect(await screen.findByText('Image not changed')).toBeInTheDocument()
    // The typed address stays so it can be fixed.
    expect(urlField()).toHaveValue('https://internal.example/a.jpg')
  })
})

describe('AT-07 replace and remove', () => {
  it('Remove image sends DELETE with If-Match, toasts and closes the dialog', async () => {
    const calls = mockImage()
    const { user } = await openForm({ image: fromUrl })
    expect(screen.getByText('From example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove image' }))
    expect(await screen.findByText('Image removed')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'DELETE', ifMatch: '"i-3"' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Add image' })).toBeInTheDocument()
  })

  it('replaces an upload with a URL and back, each request using the newest version', async () => {
    let version = matrix.version
    const calls = mockImage(async (call) => {
      version += 1
      const image = call.fileName
        ? uploaded
        : { source: 'url' as const, url: (call.body as { url: string }).url }
      return HttpResponse.json({ ...matrix, image, version })
    })
    const { user } = await openForm({ image: uploaded })
    expect(screen.getByText('Uploaded file: cover.png')).toBeInTheDocument()

    await user.type(urlField(), 'https://example.com/photo.jpg')
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Change image' }))
    expect(await screen.findByText('From example.com')).toBeInTheDocument()
    await choose(png())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(calls.map((c) => c.ifMatch)).toEqual(['"i-3"', '"i-4"'])
  })

  it('a 404 on remove shows the item-gone banner', async () => {
    mockImage(() => problemResponse(404, 'not_found'))
    const { user } = await openForm({ image: fromUrl })
    await user.click(screen.getByRole('button', { name: 'Remove image' }))
    expect((await screen.findAllByText(/deleted or moved to Trash/)).length).toBeGreaterThan(0)
  })
})

describe('AT-09 image changes and the item version', () => {
  it('a field saved after an upload sends the new If-Match "i-2" and only its own change', async () => {
    const patches: { ifMatch: string | null; body: Record<string, unknown> }[] = []
    server.use(
      http.patch(itemUrl, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        patches.push({ ifMatch: request.headers.get('If-Match'), body })
        return HttpResponse.json({ ...matrix, ...body, image: uploaded, version: 3 })
      }),
    )
    mockImage(() => HttpResponse.json({ ...matrix, image: uploaded, version: 2 }))
    const { user } = await openForm({ version: 1, image: null })

    await choose(png())
    await screen.findByText('Image uploaded')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Edit title' }))
    const title = screen.getByRole('textbox', { name: /Title/ })
    await user.clear(title)
    await user.type(title, 'A new title{Enter}')
    await waitFor(() => expect(patches).toHaveLength(1))
    expect(patches[0]?.ifMatch).toBe('"i-2"')
    expect(patches[0]?.body).toEqual({ title: 'A new title' })
  })

  it('the image request itself uses the loaded version', async () => {
    const calls = mockImage()
    await openForm({ version: 1, image: null })
    await choose(png())
    await screen.findByText('Image uploaded')
    expect(calls[0]?.ifMatch).toBe('"i-1"')
  })

  it('a 412 on the image request shows the conflict banner with Reload latest and keeps the dialog', async () => {
    mockImage(() => problemResponse(412, 'version_conflict', { current_version: 5 }))
    const { user } = await openForm()
    await user.type(urlField(), 'https://example.com/photo.jpg')
    await user.click(screen.getByRole('button', { name: 'Use image URL' }))

    const banner = await screen.findByText(/Someone else changed this item/)
    expect(
      within(banner.parentElement as HTMLElement).getByRole('button', { name: 'Reload latest' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Image address saved')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
