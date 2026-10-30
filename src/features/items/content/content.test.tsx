import { QueryClientProvider } from '@tanstack/react-query'
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../../app/router'
import { ToastProvider } from '../../../components/ui'
import { exampleResponses } from '../../../mocks/fixtures'
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
    autoFocus,
  }: {
    value: string
    onChange: (value: string) => void
    label: string
    autoFocus?: boolean
  }) => (
    <textarea
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-autofocus -- test double for MarkdownEditor: it forwards the caller's autoFocus, as the real editor does
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
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

/** Opens the item and clicks the description (or its placeholder) to start writing. */
async function openForm() {
  const router = renderRouter(PATH)
  const user = userEvent.setup()
  await screen.findByRole('heading', { level: 1, name: 'The Matrix' }, { timeout: 4000 })
  const pen = await screen.findByRole('button', { name: 'Edit description' })
  await user.click(pen)
  const editor = await screen.findByRole('textbox', { name: 'Description (Markdown)' })
  return { router, user, editor }
}

const editor = () => screen.getByRole('textbox', { name: 'Description (Markdown)', hidden: true })
const type = (text: string) => fireEvent.change(editor(), { target: { value: text } })
const saveDescription = () => screen.getByRole('button', { name: 'Save description' })
const cancelDescription = () => screen.getByRole('button', { name: 'Cancel editing description' })
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

describe('F002-W3 description in place', () => {
  it('shows the text as Markdown; a click on it opens the editor prefilled; Esc and ✕ cancel', async () => {
    createContentBackend().use()
    renderRouter(PATH)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Notes', level: 3 })
    expect(screen.queryByRole('textbox', { name: 'Description (Markdown)' })).toBeNull()
    await user.click(screen.getByText(/Great film/))
    expect(await screen.findByRole('textbox', { name: 'Description (Markdown)' })).toHaveValue(
      '# Notes\n\nGreat film, rewatch in 4K.',
    )
    type('changed')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Description (Markdown)' })).toBeNull()
    expect(screen.getByText(/Great film/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Edit description' }))
    await screen.findByRole('textbox', { name: 'Description (Markdown)' })
    await user.click(cancelDescription())
    expect(screen.queryByRole('textbox', { name: 'Description (Markdown)' })).toBeNull()
  })

  it('an empty description shows "Click to start writing"; clicking it opens the editor', async () => {
    const backend = createContentBackend([{ version: 0, body: '', created_at: '' }])
    backend.use()
    renderRouter(PATH)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Click to start writing' }))
    type('First words')
    await user.click(saveDescription())
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts).toEqual([{ ifMatch: '"c-0"', body: { body: 'First words' } }])
  })

  it('✓ PUTs the body with If-Match "c-N", closes the editor and sends no item PATCH', async () => {
    const backend = createContentBackend()
    backend.use()
    const patches = mockPatch()
    const { user } = await openForm()
    type('New text')
    await user.click(saveDescription())
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts).toEqual([{ ifMatch: '"c-2"', body: { body: 'New text' } }])
    expect(await screen.findByText('New text')).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Description (Markdown)' })).toBeNull()
    expect(patches).toHaveLength(0)
    // The next edit starts from the version the save returned.
    await user.click(screen.getByRole('button', { name: 'Edit description' }))
    type('Newer text')
    await user.click(saveDescription())
    await waitFor(() => expect(backend.puts).toHaveLength(2))
    expect(backend.puts[1]?.ifMatch).toBe('"c-3"')
  })

  it('Ctrl+Enter saves', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    type('By keyboard')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(() => expect(backend.puts).toHaveLength(1))
  })

  it('over 1 MiB: no request, a message, ✓ disabled; shortening re-enables it', async () => {
    const backend = createContentBackend()
    backend.use()
    const { user } = await openForm()
    type('x'.repeat(1024 * 1024 + 1))
    expect(saveDescription()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('the limit is 1.00 MB')
    expect(backend.puts).toHaveLength(0)
    type('short')
    expect(saveDescription()).toBeEnabled()
    await user.click(saveDescription())
    await waitFor(() => expect(backend.puts).toHaveLength(1))
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

  it('a network failure shows Retry; the text stays; Retry saves', async () => {
    const backend = createContentBackend()
    backend.use()
    let down = true
    server.use(http.put(contentUrl, () => (down ? HttpResponse.error() : undefined)))
    const { user } = await openForm()
    type('offline text')
    await user.click(saveDescription())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('could not be reached')
    expect(editor()).toHaveValue('offline text')
    down = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(backend.puts).toHaveLength(1)
  })

  it('the content failing to load shows Retry, and Retry loads the description', async () => {
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
    renderRouter(PATH)
    const user = userEvent.setup()
    const alert = await screen.findByText('The description could not be loaded.')
    await user.click(
      within(alert.parentElement as HTMLElement).getByRole('button', { name: 'Retry' }),
    )
    expect(await screen.findByRole('button', { name: 'Edit description' })).toBeVisible()
  })
})

describe('AT-09 description conflicts (412)', () => {
  async function conflict() {
    const backend = createContentBackend()
    backend.use()
    const opened = await openForm()
    backend.externalSave('Changed elsewhere')
    type('My version')
    await opened.user.click(saveDescription())
    const alert = await screen.findByRole('alert')
    return { backend, alert, ...opened }
  }

  it('keeps the draft, shows the banner and disables ✓', async () => {
    const { backend, alert } = await conflict()
    expect(alert).toHaveTextContent('Someone else changed the description')
    expect(editor()).toHaveValue('My version')
    expect(saveDescription()).toBeDisabled()
    expect(backend.puts).toEqual([{ ifMatch: '"c-2"', body: { body: 'My version' } }])
  })

  it('Copy draft writes the text; Reload latest shows the server text and closes the editor', async () => {
    const { user, alert } = await conflict()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await user.click(within(alert).getByRole('button', { name: 'Copy draft' }))
    expect(writeText).toHaveBeenCalledWith('My version')

    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    expect(await screen.findByText('Changed elsewhere')).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Description (Markdown)' })).toBeNull()
  })

  it('a 404 on save says the item is gone, keeps the draft and offers Copy', async () => {
    createContentBackend().use()
    server.use(http.put(contentUrl, () => problemResponse(404, 'not_found')))
    const { user } = await openForm()
    type('text')
    await user.click(saveDescription())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('deleted or moved to Trash')
    expect(within(alert).getByRole('button', { name: 'Copy draft' })).toBeVisible()
    expect(editor()).toHaveValue('text')
  })
})

describe('AT-22 unsaved description guard', () => {
  it('History is disabled while the editor holds unsaved text', async () => {
    createContentBackend().use()
    const { user } = await openForm()
    expect(historyButton()).toBeEnabled()
    type('dirty')
    expect(historyButton()).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(historyButton()).toBeEnabled()
  })

  it('leaving asks "Discard changes?"; Keep editing keeps the text', async () => {
    createContentBackend().use()
    localStorage.setItem(
      'collection:tree-expanded',
      JSON.stringify([
        '7c1e5a10-0000-4000-8000-000000000001',
        '7c1e5a10-0000-4000-8000-000000000002',
        '7c1e5a10-0000-4000-8000-000000000003',
      ]),
    )
    const { router, user } = await openForm()
    type('dirty')
    await user.click(
      await within(screen.getByRole('navigation', { name: 'Library' })).findByRole('link', {
        name: /Vehicles/,
      }),
    )
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Discard changes?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(editor()).toHaveValue('dirty')
    expect(router.state.location.pathname).toBe(PATH)
  })

  it('beforeunload is prevented only while the description is dirty', async () => {
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
})

describe('AT-08 web: description history (editor open)', () => {
  async function openHistory(user: User) {
    await user.click(historyButton())
    return screen.findByRole('dialog', { name: 'History' })
  }

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
    expect(await screen.findByText('Old')).toBeVisible()
    // The description now holds version 4: the next save sends If-Match "c-4".
    await user.click(screen.getByRole('button', { name: 'Edit description' }))
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
