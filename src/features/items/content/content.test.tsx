import { QueryClientProvider } from '@tanstack/react-query'
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../../app/router'
import { ToastProvider } from '../../../components/ui'
import { exampleResponses } from '../../../generated/examples'
import { problemResponse } from '../../../mocks/problems'
import { server } from '../../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../../test-utils'
import type { Item } from '../api'
import { createContentBackend } from './contentTestBackend'

// CodeMirror needs layout that jsdom does not have (see MarkdownEditor.test.tsx for the real one).
vi.mock('./MarkdownEditor', () => ({
  default: ({
    value,
    onChange,
    label,
  }: {
    value: string
    onChange: (value: string) => void
    label: string
  }) => <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />,
}))

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const itemUrl = `${location.origin}/api/v1/items/${ITEM}`
const contentUrl = `${itemUrl}/content`
const matrix = exampleResponses.getItem.body as Item

// Cold lazy chunks are slow when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 4000 })
vi.setConfig({ testTimeout: 15000 })

type User = ReturnType<typeof userEvent.setup>

function renderRouter(path: string) {
  mockViewport(1100)
  const router = createTestRouter([path])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

/** Opens the edit form and waits for the description editor. */
async function openForm() {
  const router = renderRouter(`${PATH}?edit=1`)
  const user = userEvent.setup()
  await screen.findByRole('heading', { level: 1, name: /^Edit/ }, { timeout: 4000 })
  const editor = await screen.findByRole('textbox', { name: 'Description (Markdown)' })
  return { router, user, editor }
}

const editor = () => screen.getByRole('textbox', { name: 'Description (Markdown)', hidden: true })
const type = (text: string) => fireEvent.change(editor(), { target: { value: text } })
const saveDescription = () => screen.getByRole('button', { name: 'Save description' })
const historyButton = () => screen.getByRole('button', { name: 'History' })

function mockPatch() {
  const calls: { ifMatch: string | null; body: Record<string, unknown> }[] = []
  server.use(
    http.patch(itemUrl, async ({ request }) => {
      const call = {
        ifMatch: request.headers.get('If-Match'),
        body: (await request.json()) as Record<string, unknown>,
      }
      calls.push(call)
      return HttpResponse.json({ ...matrix, ...call.body, version: matrix.version + 1 })
    }),
  )
  return calls
}

const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
afterEach(() => {
  if (original) Object.defineProperty(navigator, 'clipboard', original)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

describe('AT-08 web: description preview', () => {
  it('is prefilled from the loaded content', async () => {
    createContentBackend().use()
    await openForm()
    expect(editor()).toHaveValue('# Notes\n\nGreat film, rewatch in 4K.')
  })

  it('Preview renders Markdown', async () => {
    createContentBackend().use()
    const { user } = await openForm()
    type('# Title\n\n**bold** text')
    await user.click(screen.getByRole('radio', { name: 'Preview' }))
    const preview = screen.getByRole('region', { name: 'Description preview' })
    expect(within(preview).getByRole('heading', { name: 'Title' })).toBeInTheDocument()
    expect(preview.querySelector('strong')).toHaveTextContent('bold')
    // The draft survives switching back.
    await user.click(screen.getByRole('radio', { name: 'Edit' }))
    expect(editor()).toHaveValue('# Title\n\n**bold** text')
  })

  it('Preview of an empty draft says there is nothing to preview', async () => {
    createContentBackend().use()
    const { user } = await openForm()
    type('  ')
    await user.click(screen.getByRole('radio', { name: 'Preview' }))
    expect(screen.getByText('Nothing to preview yet.')).toBeInTheDocument()
  })

  it('Preview drops <script>, javascript: links and onerror handlers', async () => {
    createContentBackend().use()
    const { user } = await openForm()
    type(
      [
        'before',
        '',
        '<script>window.__pwned = 1</script>',
        '',
        '[click me](javascript:alert(1))',
        '',
        '<img src="x" onerror="window.__pwned = 2">',
        '',
        '[fine](https://example.org/ok)',
      ].join('\n'),
    )
    await user.click(screen.getByRole('radio', { name: 'Preview' }))
    const preview = screen.getByRole('region', { name: 'Description preview' })
    expect(preview).toHaveTextContent('before')
    expect(preview.querySelector('script')).toBeNull()
    expect(preview.querySelector('img')).toBeNull()
    expect(preview.querySelector('[onerror]')).toBeNull()
    for (const link of preview.querySelectorAll('a')) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^\s*javascript:/i)
    }
    expect(within(preview).getByRole('link', { name: 'fine' })).toHaveAttribute(
      'href',
      'https://example.org/ok',
    )
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
  })
})

describe('AT-08 web: saving the description', () => {
  it('PUTs the body with If-Match "c-N" of the loaded version, then disables Save', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    expect(saveDescription()).toBeDisabled()
    type('New text')
    expect(saveDescription()).toBeEnabled()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(saveDescription())

    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts).toEqual([{ ifMatch: '"c-2"', body: { body: 'New text' } }])
    expect(saveDescription()).toBeDisabled()
    expect(editor()).toHaveValue('New text')
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('the next save uses the version the previous save returned', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    type('one')
    await user.click(saveDescription())
    await screen.findByText('Description saved')
    type('two')
    await user.click(saveDescription())
    await waitFor(() => expect(backend.puts).toHaveLength(2))
    expect(backend.puts.map((call) => call.ifMatch)).toEqual(['"c-2"', '"c-3"'])
  })

  it('a response with the same version shows "No changes"', async () => {
    server.use(
      http.get(contentUrl, () => HttpResponse.json(exampleResponses.getItemContent.body as object)),
      http.put(contentUrl, () =>
        HttpResponse.json(exampleResponses.updateItemContent.body as object),
      ),
    )
    const { user } = await openForm()
    type('different')
    await user.click(saveDescription())
    expect(await screen.findByText('No changes')).toBeInTheDocument()
    expect(screen.queryByText('Description saved')).not.toBeInTheDocument()
  })

  it('exactly 1 MiB is accepted', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    type('a'.repeat(1024 * 1024))
    expect(screen.queryByText(/the limit is/)).not.toBeInTheDocument()
    await user.click(saveDescription())
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts).toHaveLength(1)
  })

  it('over 1 MiB: no request, a message, Save disabled; shortening re-enables it', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    type('a'.repeat(1024 * 1024 + 1))
    expect(screen.getByText(/the limit is 1\.00 MB/)).toBeInTheDocument()
    expect(saveDescription()).toBeDisabled()
    await user.click(saveDescription())
    expect(backend.puts).toHaveLength(0)

    type('short')
    expect(screen.queryByText(/the limit is/)).not.toBeInTheDocument()
    expect(saveDescription()).toBeEnabled()
  })

  it('the limit counts bytes: 524289 two-byte characters are too large', async () => {
    createContentBackend().use()
    await openForm()
    type('é'.repeat(1024 * 512 + 1))
    expect(screen.getByText(/the limit is/)).toBeInTheDocument()
    expect(saveDescription()).toBeDisabled()
  })

  it('a 413 from the server shows the size message and keeps the draft', async () => {
    createContentBackend().use()
    server.use(http.put(contentUrl, () => problemResponse(413, 'payload_too_large')))
    const { user } = await openForm()
    type('text')
    await user.click(saveDescription())
    expect(await screen.findByText('The description is too large (limit 1 MiB).')).toBeVisible()
    expect(editor()).toHaveValue('text')
  })

  it('an empty description can be saved (clearing the text)', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    type('')
    await user.click(saveDescription())
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts[0]?.body).toEqual({ body: '' })
  })

  it('the content failing to load shows Retry, and Retry loads the editor', async () => {
    const backend = createContentBackend()
    let calls = 0
    server.use(
      http.get(contentUrl, () => {
        calls++
        return calls === 1
          ? problemResponse(500, 'internal_error')
          : HttpResponse.json(backend.current())
      }),
    )
    renderRouter(`${PATH}?edit=1`)
    const user = userEvent.setup()
    const alert = await screen.findByText('The description could not be loaded.')
    await user.click(
      within(alert.parentElement as HTMLElement).getByRole('button', { name: 'Retry' }),
    )
    expect(await screen.findByRole('textbox', { name: 'Description (Markdown)' })).toBeVisible()
  })
})

describe('AT-08 web: description conflicts (412)', () => {
  async function conflict() {
    const backend = createContentBackend()
    backend.use()
    const ctx = await openForm()
    backend.externalSave('Someone else wrote this')
    type('My draft')
    await ctx.user.click(saveDescription())
    const banner = await screen.findByText(/Someone else changed the description/)
    return { ...ctx, backend, banner }
  }

  it('keeps the draft, shows the banner and disables Save', async () => {
    const { backend } = await conflict()
    expect(backend.puts).toHaveLength(1)
    expect(editor()).toHaveValue('My draft')
    expect(saveDescription()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy my draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload latest' })).toBeInTheDocument()
    // Not retried behind the user's back.
    expect(backend.puts).toHaveLength(1)
  })

  it('Copy my draft writes the draft to the clipboard', async () => {
    const { user } = await conflict()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await user.click(screen.getByRole('button', { name: 'Copy my draft' }))
    expect(await screen.findByText('Draft copied to the clipboard')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith('My draft')
  })

  it('falls back to a dialog with the text when the clipboard throws', async () => {
    const { user } = await conflict()
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await user.click(screen.getByRole('button', { name: 'Copy my draft' }))
    const dialog = await screen.findByRole('dialog', { name: 'Copy your draft' })
    expect(within(dialog).getByRole('textbox', { name: 'Your draft' })).toHaveValue('My draft')
    expect(screen.queryByText('Draft copied to the clipboard')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog', { name: 'Copy your draft' })).not.toBeInTheDocument()
  })

  it('falls back to the dialog when there is no clipboard at all', async () => {
    const { user } = await conflict()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await user.click(screen.getByRole('button', { name: 'Copy my draft' }))
    expect(await screen.findByRole('dialog', { name: 'Copy your draft' })).toBeInTheDocument()
  })

  it('Keep my draft closes the confirmation and leaves the draft', async () => {
    const { user } = await conflict()
    await user.click(screen.getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Keep my draft' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(editor()).toHaveValue('My draft')
    expect(saveDescription()).toBeDisabled()
  })

  it('Reload latest asks first, then shows the server body and re-enables saving', async () => {
    const { user, backend } = await conflict()
    await user.click(screen.getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    // Nothing is discarded before the user confirms.
    expect(editor()).toHaveValue('My draft')
    await user.click(within(dialog).getByRole('button', { name: 'Reload latest' }))

    await waitFor(() => expect(editor()).toHaveValue('Someone else wrote this'))
    expect(screen.queryByText(/Someone else changed the description/)).not.toBeInTheDocument()
    expect(saveDescription()).toBeDisabled()

    // The next edit saves against the latest version.
    type('Merged')
    await user.click(saveDescription())
    await screen.findByText('Description saved')
    expect(backend.puts.at(-1)?.ifMatch).toBe(`"c-${backend.current().version - 1}"`)
  })

  // BUG (source): a failed refetch turns the query status to 'error', so ContentSection unmounts the
  // editor and shows "could not be loaded": the draft is lost. `it.fails` flips to red once fixed.
  it('Reload latest keeps the draft when the refetch fails', async () => {
    const { user } = await conflict()
    server.use(http.get(contentUrl, () => problemResponse(500, 'internal_error')))
    await user.click(screen.getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reload latest' }))
    expect(
      await screen.findByText('The latest version could not be loaded. Try again.'),
    ).toBeVisible()
    expect(editor()).toHaveValue('My draft')
  })

  it('a 404 on save says the item is gone, keeps the draft and offers Copy', async () => {
    createContentBackend().use()
    server.use(http.put(contentUrl, () => problemResponse(404, 'not_found')))
    const { user } = await openForm()
    type('text')
    await user.click(saveDescription())
    expect(await screen.findByText(/deleted or moved to Trash/)).toBeVisible()
    expect(editor()).toHaveValue('text')
    expect(saveDescription()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy my draft' })).toBeInTheDocument()
  })
})

describe('AT-08 web: description server and network errors', () => {
  it('a 5xx shows an inline error with Retry; the draft stays; Retry succeeds', async () => {
    const backend = createContentBackend()
    backend.use()
    let failOnce = true
    server.use(
      http.put(contentUrl, () => {
        if (!failOnce) return // falls through to the stateful backend
        failOnce = false
        return problemResponse(503, 'unavailable')
      }),
    )
    const { user } = await openForm()
    type('Retry me')
    await user.click(saveDescription())
    expect(await screen.findByText(/The server could not be reached/)).toBeVisible()
    expect(editor()).toHaveValue('Retry me')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts.at(-1)).toEqual({ ifMatch: '"c-2"', body: { body: 'Retry me' } })
    expect(screen.queryByText(/The server could not be reached/)).not.toBeInTheDocument()
  })

  it('a network failure shows the same inline error and keeps the draft', async () => {
    createContentBackend().use()
    server.use(http.put(contentUrl, () => HttpResponse.error()))
    const { user } = await openForm()
    type('offline text')
    await user.click(saveDescription())
    expect(await screen.findByText(/The server could not be reached/)).toBeVisible()
    expect(editor()).toHaveValue('offline text')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

describe('AT-05 web: description is independent of Basics', () => {
  it('saving the description sends no PATCH and keeps the Basics draft', async () => {
    createContentBackend().use()
    const patches = mockPatch()
    const { user } = await openForm()
    const title = screen.getByLabelText(/^Title/)
    fireEvent.change(title, { target: { value: 'Edited title' } })
    type('Description text')
    await user.click(saveDescription())
    await screen.findByText('Description saved')

    expect(patches).toHaveLength(0)
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Edited title')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('saving Basics while the description is dirty stays in edit mode and keeps that draft', async () => {
    const backend = createContentBackend()
    backend.use()
    const patches = mockPatch()
    const { router, user } = await openForm()
    type('Unsaved description')
    const title = screen.getByLabelText(/^Title/)
    fireEvent.change(title, { target: { value: 'Edited title' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Item saved')).toBeInTheDocument()
    expect(patches).toHaveLength(1)
    expect(patches[0]?.body).toEqual({ title: 'Edited title' })
    expect(router.state.location.search).toBe('?edit=1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit “Edited title”' }),
    ).toBeVisible()
    expect(editor()).toHaveValue('Unsaved description')
    expect(backend.puts).toHaveLength(0)
    // Basics is clean again; the description is still savable.
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(saveDescription()).toBeEnabled()
  })

  it('saving the description does not change the item If-Match used later by Basics', async () => {
    createContentBackend().use()
    const patches = mockPatch()
    const { user } = await openForm()
    type('Description text')
    await user.click(saveDescription())
    await screen.findByText('Description saved')

    const title = screen.getByLabelText(/^Title/)
    fireEvent.change(title, { target: { value: 'After description' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Item saved')
    expect(patches[0]?.ifMatch).toBe(`"i-${matrix.version}"`)
  })
})

describe('AT-22 web: unsaved description guard', () => {
  it('with a dirty description, Cancel asks "Discard changes?"', async () => {
    createContentBackend().use()
    const { router, user } = await openForm()
    type('dirty')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Discard changes?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.search).toBe('?edit=1')
    expect(editor()).toHaveValue('dirty')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('a clean description lets Cancel leave without a dialog', async () => {
    createContentBackend().use()
    const { router, user } = await openForm()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('beforeunload is prevented while the description is dirty', async () => {
    createContentBackend().use()
    await openForm()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)
    type('dirty')
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })

  it('Move to another list is disabled while the description is dirty, enabled after saving', async () => {
    createContentBackend().use()
    const { user } = await openForm()
    const move = () => screen.getByRole('button', { name: 'Move to another list' })
    expect(move()).toBeEnabled()
    type('dirty')
    expect(move()).toBeDisabled()
    expect(screen.getByText('Save or discard your changes before moving.')).toBeInTheDocument()
    await user.click(saveDescription())
    await screen.findByText('Description saved')
    expect(move()).toBeEnabled()
  })
})

describe('AT-08 web: description history (edit mode)', () => {
  async function openHistory(user: User) {
    await user.click(historyButton())
    return screen.findByRole('dialog', { name: 'History' })
  }

  it('History is disabled while the editor is dirty and enabled again after saving', async () => {
    createContentBackend().use()
    const { user } = await openForm()
    expect(historyButton()).toBeEnabled()
    type('dirty')
    expect(historyButton()).toBeDisabled()
    expect(screen.getByText('Save or discard first.')).toBeInTheDocument()
    await user.click(saveDescription())
    await screen.findByText('Description saved')
    expect(historyButton()).toBeEnabled()
  })

  it('lists versions newest first with their size and marks the current one', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    const drawer = await openHistory(user)
    const items = await within(drawer).findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Version 2 (current)')
    expect(items[0]).toHaveTextContent('35 B')
    expect(items[1]).toHaveTextContent('Version 1')
    expect(items[1]).not.toHaveTextContent('(current)')
    expect(items[1]).toHaveTextContent('3 B')
  })

  it('shows an empty state when there are no versions', async () => {
    createContentBackend().use()
    server.use(http.get(`${contentUrl}/versions`, () => HttpResponse.json({ data: [] })))
    const { user } = await openForm()
    const drawer = await openHistory(user)
    expect(await within(drawer).findByText('No saved versions yet.')).toBeInTheDocument()
  })

  it('a failing history list shows Retry', async () => {
    createContentBackend().use()
    let calls = 0
    server.use(
      http.get(`${contentUrl}/versions`, () => {
        calls++
        return calls === 1
          ? problemResponse(500, 'internal_error')
          : HttpResponse.json(exampleResponses.listContentVersions.body as object)
      }),
    )
    const { user } = await openForm()
    const drawer = await openHistory(user)
    expect(await within(drawer).findByText('The history could not be loaded.')).toBeVisible()
    await user.click(within(drawer).getByRole('button', { name: 'Retry' }))
    expect(await within(drawer).findByText('Version 2 (current)')).toBeVisible()
  })

  it('selecting a version previews it as Markdown; the current version has no Restore', async () => {
    const backend = createContentBackend([
      { version: 1, body: '# Old heading\n\n**old**', created_at: '2026-10-14T09:00:00Z' },
      { version: 2, body: 'Current text', created_at: '2026-10-14T09:15:00Z' },
    ])
    backend.use()
    const { user } = await openForm()
    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    const preview = await within(drawer).findByRole('region', { name: 'Preview of version 1' })
    expect(await within(preview).findByRole('heading', { name: 'Old heading' })).toBeVisible()
    expect(within(preview).getByRole('button', { name: 'Restore this version' })).toBeEnabled()

    await user.click(within(drawer).getByRole('button', { name: /^Version 2/ }))
    const current = await within(drawer).findByRole('region', { name: 'Preview of version 2' })
    expect(await within(current).findByText('Current text')).toBeVisible()
    expect(within(current).queryByRole('button', { name: 'Restore this version' })).toBeNull()
  })

  it('Restore asks first, then POSTs with the CURRENT version If-Match and { version }', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    // Move the current version on to 3 through a normal save first.
    type('Saved v3')
    await user.click(saveDescription())
    await screen.findByText('Description saved')

    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    await user.click(await within(drawer).findByRole('button', { name: 'Restore this version' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByRole('heading', { name: 'Restore version 1?' })).toBeVisible()
    expect(backend.restores).toHaveLength(0)
    await user.click(within(confirm).getByRole('button', { name: 'Restore this version' }))

    expect(await screen.findByText('Restored version 1')).toBeInTheDocument()
    expect(backend.restores).toEqual([{ ifMatch: '"c-3"', body: { version: 1 } }])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'History' })).toBeNull())
    expect(editor()).toHaveValue('Old')
    expect(saveDescription()).toBeDisabled()
    // The editor now holds version 4: the next save sends If-Match "c-4".
    type('After restore')
    await user.click(saveDescription())
    await waitFor(() => expect(backend.puts).toHaveLength(2))
    expect(backend.puts.at(-1)?.ifMatch).toBe('"c-4"')
  })

  it('cancelling the Restore confirmation sends nothing', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    await user.click(await within(drawer).findByRole('button', { name: 'Restore this version' }))
    const confirm = await screen.findByRole('alertdialog')
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(backend.restores).toHaveLength(0)
    expect(editor()).toHaveValue('# Notes\n\nGreat film, rewatch in 4K.')
  })

  it('a pruned version (404 on preview) shows the pruned message and a refresh button', async () => {
    const backend = createContentBackend()
    backend.pruned.add(1)
    backend.use()
    const { user } = await openForm()
    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    expect(
      await within(drawer).findByText(
        'This version is no longer available (older versions are pruned).',
      ),
    ).toBeVisible()
    expect(within(drawer).queryByRole('button', { name: 'Restore this version' })).toBeNull()

    const lists = backend.counts.versionLists
    await user.click(within(drawer).getByRole('button', { name: 'Refresh the list' }))
    await waitFor(() => expect(backend.counts.versionLists).toBeGreaterThan(lists))
    expect(within(drawer).queryByRole('region', { name: /^Preview of version/ })).toBeNull()
  })

  it('a 404 on restore shows the pruned message and refreshes the list', async () => {
    const backend = createContentBackend()
    backend.use()
    server.use(http.post(`${contentUrl}/restore`, () => problemResponse(404, 'not_found')))
    const { user } = await openForm()
    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    await user.click(await within(drawer).findByRole('button', { name: 'Restore this version' }))
    const lists = backend.counts.versionLists
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Restore this version',
      }),
    )
    expect(
      await within(drawer).findByText(
        'That version is no longer available (older versions are pruned).',
      ),
    ).toBeVisible()
    await waitFor(() => expect(backend.counts.versionLists).toBeGreaterThan(lists))
    expect(editor()).toHaveValue('# Notes\n\nGreat film, rewatch in 4K.')
  })

  it('a 412 on restore shows a message, refreshes, and the editor adopts the newer version', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    backend.externalSave('Changed elsewhere') // version 3 now exists on the server
    const lists = backend.counts.versionLists
    await user.click(await within(drawer).findByRole('button', { name: 'Restore this version' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Restore this version',
      }),
    )
    expect(
      await within(drawer).findByText(
        'The description changed since you opened it. The list was refreshed; try again.',
      ),
    ).toBeVisible()
    expect(backend.restores).toEqual([{ ifMatch: '"c-2"', body: { version: 1 } }])
    await waitFor(() => expect(backend.counts.versionLists).toBeGreaterThan(lists))
    // The list now shows version 3, and the clean editor took over the latest text.
    expect(await within(drawer).findByText('Version 3 (current)')).toBeVisible()
    await waitFor(() => expect(editor()).toHaveValue('Changed elsewhere'))
  })

  it('a network failure on restore keeps everything and says nothing was restored', async () => {
    createContentBackend().use()
    server.use(http.post(`${contentUrl}/restore`, () => HttpResponse.error()))
    const { user } = await openForm()
    const drawer = await openHistory(user)
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    await user.click(await within(drawer).findByRole('button', { name: 'Restore this version' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Restore this version',
      }),
    )
    expect(
      await within(drawer).findByText('The server could not be reached. Nothing was restored.'),
    ).toBeVisible()
  })
})
