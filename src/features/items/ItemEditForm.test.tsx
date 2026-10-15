import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { exampleResponses } from '../../generated/examples'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../test-utils'
import type { Item } from './api'

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const MOTORBIKES = '7c1e5a10-0000-4000-8000-000000000012'
const MEDIA = '7c1e5a10-0000-4000-8000-000000000001'
const MOVIES = '7c1e5a10-0000-4000-8000-000000000002'
const VEHICLES = '7c1e5a10-0000-4000-8000-000000000003'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const itemUrl = `${location.origin}/api/v1/items/${ITEM}`

const matrix = exampleResponses.getItem.body as Item
const matrixMetadata = matrix.metadata

type User = ReturnType<typeof userEvent.setup>

function renderRouter(path: string, width = 1100) {
  mockViewport(width)
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

/** Serves `over` merged into the example movie for `GET /items/:id`. */
function serveItem(over: Partial<Item>) {
  server.use(http.get(itemUrl, () => HttpResponse.json({ ...matrix, ...over })))
}

/** Opens `?edit=1` and waits for the form. */
async function openForm(options: { item?: Partial<Item>; search?: string; width?: number } = {}) {
  if (options.item) serveItem(options.item)
  const router = renderRouter(`${PATH}?edit=1${options.search ?? ''}`, options.width)
  const user = userEvent.setup()
  await screen.findByRole('heading', { level: 1, name: /^Edit/ })
  return { router, user }
}

interface PatchCall {
  ifMatch: string | null
  body: Record<string, unknown>
}

/** Records every `PATCH /items/:id`; answers with the patch applied (version + 1) unless told otherwise. */
function mockPatch(respond?: (call: PatchCall, n: number) => Response | Promise<Response>) {
  const calls: PatchCall[] = []
  server.use(
    http.patch(itemUrl, async ({ request }) => {
      const call = {
        ifMatch: request.headers.get('If-Match'),
        body: (await request.json()) as Record<string, unknown>,
      }
      calls.push(call)
      if (respond) return respond(call, calls.length)
      return HttpResponse.json({ ...matrix, ...call.body, version: matrix.version + 1 })
    }),
  )
  return calls
}

/** The input of a label; required fields carry a decorative " *" in the label text. */
const labelPattern = (name: string) => new RegExp(`^${name}( \\*)?$`)
const field = (name: string) => screen.getByLabelText(labelPattern(name))
const saveButton = () => screen.getByRole('button', { name: 'Save changes' })
const search = (router: ReturnType<typeof createTestRouter>) => router.state.location.search
const pathname = (router: ReturnType<typeof createTestRouter>) => router.state.location.pathname

async function retype(user: User, label: string, text: string) {
  const input = field(label)
  await user.clear(input)
  if (text) await user.type(input, text)
}

async function chooseOption(user: User, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('AT-05 edit form: saving', () => {
  it('opens from the Edit button with ?edit=1 and an Edit “title” heading', async () => {
    const router = renderRouter(PATH)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit “The Matrix”' }),
    ).toBeInTheDocument()
    expect(search(router)).toBe('?edit=1')
  })

  it('is prefilled from the item', async () => {
    await openForm()
    expect(field('Title')).toHaveValue('The Matrix')
    expect(field('Summary')).toHaveValue('A hacker learns the truth about reality.')
    expect(field('Status')).toHaveValue('Watched')
    expect(field('Release year')).toHaveValue('1999')
    expect(field('Runtime')).toHaveValue('136')
    expect(field('IMDb link')).toHaveValue('https://www.imdb.com/title/tt0133093/')
    expect(field('Streaming country')).toHaveValue('Italy (IT)')
    expect(field('Streaming platforms')).toHaveValue('Netflix, Prime Video')
    expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent('Movie')
  })

  it('changing only the title sends exactly { title } with the item If-Match', async () => {
    const calls = mockPatch()
    const { router, user } = await openForm()
    await retype(user, 'Title', 'The Matrix Reloaded')
    await user.click(saveButton())

    expect(await screen.findByText('Item saved')).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    expect(calls[0]?.ifMatch).toBe('"i-3"')
    expect(calls[0]?.body).toEqual({ title: 'The Matrix Reloaded' })
    // Back in view mode.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The Matrix Reloaded' }),
    ).toBeInTheDocument()
    expect(search(router)).toBe('')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('an unchanged form has Save disabled and Cancel returns without a dialog', async () => {
    const calls = mockPatch()
    const { router, user } = await openForm()
    expect(saveButton()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'The Matrix' })).toBeInTheDocument()
    expect(search(router)).toBe('')
    expect(calls).toHaveLength(0)
  })

  it('Save is enabled by an edit and disabled again when the edit is undone', async () => {
    const { user } = await openForm()
    await user.type(field('Title'), '!')
    expect(saveButton()).toBeEnabled()
    await user.type(field('Title'), '{Backspace}')
    expect(saveButton()).toBeDisabled()
  })

  it('an empty title shows "Enter a title." and sends nothing', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await user.clear(field('Title'))
    await user.click(saveButton())
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument()
    expect(field('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Title')).toHaveFocus()
    expect(calls).toHaveLength(0)
  })

  it('clearing the summary sends summary: null', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await user.clear(field('Summary'))
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ summary: null })
  })

  it('editing a kind field sends the full metadata object', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await retype(user, 'Runtime', '140')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ metadata: { ...matrixMetadata, runtime_minutes: 140 } })
  })

  it('a bad kind field value blocks the save and is reported on the input', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await retype(user, 'Release year', '1800')
    await user.click(saveButton())
    expect(field('Release year')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Release year')).toHaveFocus()
    expect(calls).toHaveLength(0)
  })

  it('an unusable official website is rejected on the input', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await user.type(field('Official website'), 'javascript:alert(1)')
    await user.click(saveButton())
    expect(field('Official website')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toHaveLength(0)
  })
})

describe('AT-05 edit form: kind change', () => {
  it('warns that details are cleared and sends kind plus metadata: {}', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    await chooseOption(user, 'Kind', 'Car')
    expect(await screen.findByRole('note')).toHaveTextContent(
      'Switching kind clears the Movie details.',
    )
    // The movie fields are gone, the car ones are there.
    expect(screen.queryByLabelText(labelPattern('Runtime'))).not.toBeInTheDocument()
    expect(field('Fuel')).toBeInTheDocument()

    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ kind: 'car', metadata: {} })
  })

  it('shows no warning when the item has no details, but still sends metadata: {}', async () => {
    const calls = mockPatch()
    const { user } = await openForm({ item: { kind: 'generic', metadata: {} } })
    await chooseOption(user, 'Kind', 'Movie')
    expect(field('Release year')).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ kind: 'movie', metadata: {} })
  })

  it('switching to another kind and back restores the details and the unchanged state', async () => {
    const { user } = await openForm()
    await chooseOption(user, 'Kind', 'Camera')
    expect(saveButton()).toBeEnabled()
    await chooseOption(user, 'Kind', 'Movie')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(field('Runtime')).toHaveValue('136')
    expect(field('Streaming platforms')).toHaveValue('Netflix, Prime Video')
    expect(saveButton()).toBeDisabled()
  })

  it('values typed for the new kind are sent with the kind change', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await chooseOption(user, 'Kind', 'Car')
    await user.type(field('Seats'), '5')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ kind: 'car', metadata: { seats: 5 } })
  })
})

describe('AT-05 edit form: kind fields of every kind', () => {
  const cases = [
    [
      'movie',
      'Movie',
      ['Release year', 'Runtime', 'IMDb link', 'Streaming country', 'Streaming platforms'],
    ],
    [
      'tv_show',
      'TV show',
      ['First aired', 'Ended', 'Seasons', 'IMDb link', 'Streaming country', 'Streaming platforms'],
    ],
    [
      'motorcycle',
      'Motorcycle',
      [
        'Make',
        'Model',
        'Model year',
        'Segment',
        'Displacement',
        'Power',
        'Torque',
        'Wet weight',
        'Seat height',
        'License class',
      ],
    ],
    [
      'car',
      'Car',
      [
        'Make',
        'Model',
        'Trim',
        'Model year',
        'Body type',
        'Fuel',
        'Transmission',
        'Power',
        'Seats',
        'Electric range',
      ],
    ],
    [
      'camera',
      'Camera',
      ['Make', 'Model', 'Release year', 'Type', 'Sensor', 'Resolution', 'Lens mount', 'Weight'],
    ],
  ] as const

  it.each(cases)('%s renders its kind fields', async (kind, label, labels) => {
    await openForm({ item: { kind, metadata: {} } })
    expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent(label)
    expect(screen.getByRole('heading', { level: 2, name: `${label} details` })).toBeInTheDocument()
    for (const name of labels) expect(field(name)).toBeInTheDocument()
  })

  it('generic has no kind fields', async () => {
    await openForm({ item: { kind: 'generic', metadata: {} } })
    expect(screen.queryByRole('heading', { name: /details$/ })).not.toBeInTheDocument()
  })

  it('a camera item is prefilled, including enum labels', async () => {
    await openForm({
      item: {
        kind: 'camera',
        metadata: { make: 'Sony', megapixels: 24.2, sensor_format: 'full_frame' },
      },
    })
    expect(field('Make')).toHaveValue('Sony')
    expect(field('Resolution')).toHaveValue('24.2')
    expect(field('Sensor')).toHaveTextContent('Full frame')
    expect(field('Type')).toHaveTextContent('Not set')
  })

  it('setting an enum sends its value', async () => {
    const calls = mockPatch()
    const { user } = await openForm({
      item: { kind: 'camera', metadata: { make: 'Sony' } },
    })
    await chooseOption(user, 'Sensor', 'Full frame')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ metadata: { make: 'Sony', sensor_format: 'full_frame' } })
  })
})

describe('AT-05 edit form: price', () => {
  it('min above max shows an error on Maximum price and sends nothing', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await user.type(field('Minimum price'), '20')
    await user.type(field('Maximum price'), '10')
    await user.click(saveButton())
    expect(await screen.findByText(/lower than the minimum/)).toBeInTheDocument()
    expect(field('Maximum price')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Minimum price')).not.toHaveAttribute('aria-invalid')
    expect(field('Maximum price')).toHaveFocus()
    expect(calls).toHaveLength(0)
  })

  it('a malformed price is rejected on its input', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await user.type(field('Minimum price'), '1,5')
    await user.click(saveButton())
    expect(field('Minimum price')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toHaveLength(0)
  })

  it('a price without a chosen currency uses the settings currency, with 2 decimals', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR · Euro'),
    )
    await user.type(field('Minimum price'), '12.5')
    await user.type(field('Maximum price'), '20')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ price: { min: '12.50', max: '20.00', currency: 'EUR' } })
  })

  it('a chosen currency is sent instead', async () => {
    const calls = mockPatch()
    const { user } = await openForm()
    await user.type(field('Maximum price'), '9')
    await chooseOption(user, 'Currency', 'USD · US Dollar')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ price: { min: null, max: '9.00', currency: 'USD' } })
  })

  it('shows the "up to" hint only when just a maximum is set', async () => {
    const { user } = await openForm()
    const hint = /shows as “up to” this amount/
    expect(screen.queryByText(hint)).not.toBeInTheDocument()
    await user.type(field('Maximum price'), '9')
    expect(screen.getByText(hint)).toBeInTheDocument()
    await user.type(field('Minimum price'), '5')
    expect(screen.queryByText(hint)).not.toBeInTheDocument()
  })

  it('clearing the price of an item that had one sends price: null', async () => {
    const calls = mockPatch()
    const { user } = await openForm({
      item: { price: { min: '5.00', max: '10.00', currency: 'EUR' } as Item['price'] },
    })
    expect(field('Minimum price')).toHaveValue('5.00')
    await user.clear(field('Minimum price'))
    await user.clear(field('Maximum price'))
    await user.click(saveButton())
    await screen.findByText('Item saved')
    expect(calls[0]?.body).toEqual({ price: null })
  })
})

describe('AT-05 edit form: 422 mapping', () => {
  it('puts messages under the matching inputs, focuses the first, lists the rest, keeps the draft', async () => {
    mockPatch(() =>
      problemResponse(422, 'validation_failed', {
        errors: [
          { field: 'metadata.runtime_minutes', message: 'Runtime is out of range.' },
          { field: 'price.max', message: 'Maximum is not a price.' },
          { field: 'bogus.thing', message: 'Strange problem.' },
        ],
      }),
    )
    const { user } = await openForm()
    await retype(user, 'Title', 'Edited title')
    await retype(user, 'Runtime', '140')
    await user.type(field('Maximum price'), '9')
    await user.click(saveButton())

    expect(await screen.findByText('Runtime is out of range.')).toBeInTheDocument()
    expect(screen.getByText('Maximum is not a price.')).toBeInTheDocument()
    expect(field('Runtime')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Maximum price')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Title')).not.toHaveAttribute('aria-invalid')

    // Page order: price comes before the kind fields.
    await waitFor(() => expect(field('Maximum price')).toHaveFocus())

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Strange problem.')
    expect(alert).toHaveTextContent('bogus.thing')

    // Nothing the user typed is lost, and the form is still the form.
    expect(field('Title')).toHaveValue('Edited title')
    expect(field('Runtime')).toHaveValue('140')
    expect(field('Maximum price')).toHaveValue('9')
    expect(screen.getByRole('heading', { level: 1, name: 'Edit “The Matrix”' })).toBeInTheDocument()
  })

  it('a title error from the server sits under Title and takes focus', async () => {
    mockPatch(() =>
      problemResponse(422, 'validation_failed', {
        errors: [{ field: 'title', message: 'Title is taken.' }],
      }),
    )
    const { user } = await openForm()
    await user.type(field('Title'), ' 2')
    await user.click(saveButton())
    expect(await screen.findByText('Title is taken.')).toBeInTheDocument()
    await waitFor(() => expect(field('Title')).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('typing in an input clears its server error', async () => {
    mockPatch(() =>
      problemResponse(422, 'validation_failed', {
        errors: [{ field: 'title', message: 'Title is taken.' }],
      }),
    )
    const { user } = await openForm()
    await user.type(field('Title'), ' 2')
    await user.click(saveButton())
    await screen.findByText('Title is taken.')
    await user.type(field('Title'), '3')
    expect(screen.queryByText('Title is taken.')).not.toBeInTheDocument()
  })
})

describe('AT-09 conflict', () => {
  const CONFLICT =
    'Someone else changed this item while you were editing. Your changes have not been saved.'
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original)
    else Reflect.deleteProperty(navigator, 'clipboard')
  })

  /** Opens the form, edits title and runtime, saves and gets a 412. */
  async function conflict() {
    const calls = mockPatch(() => problemResponse(412, 'version_conflict', { current_version: 4 }))
    const { router, user } = await openForm()
    await retype(user, 'Title', 'My new title')
    await retype(user, 'Runtime', '150')
    await user.click(saveButton())
    const alert = await screen.findByRole('alert')
    return { calls, router, user, alert }
  }

  it('shows the conflict banner and keeps the form and every edited value', async () => {
    const { calls, alert } = await conflict()
    expect(within(alert).getByText(CONFLICT)).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Copy my draft' })).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Reload latest' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Edit “The Matrix”' })).toBeInTheDocument()
    expect(field('Title')).toHaveValue('My new title')
    expect(field('Runtime')).toHaveValue('150')
    // No automatic retry and no silent overwrite: exactly the one request, with the old version.
    expect(calls).toHaveLength(1)
    expect(calls[0]?.ifMatch).toBe('"i-3"')
    expect(screen.queryByText('Item saved')).not.toBeInTheDocument()
  })

  it('cannot be saved again over the conflict', async () => {
    const { calls } = await conflict()
    expect(saveButton()).toBeDisabled()
    expect(calls).toHaveLength(1)
  })

  it('Copy my draft writes the changed fields to the clipboard and confirms', async () => {
    const { user, alert } = await conflict()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await user.click(within(alert).getByRole('button', { name: 'Copy my draft' }))
    expect(await screen.findByText('Draft copied to the clipboard')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0]?.[0] as string
    expect(text).toContain('Title: My new title')
    expect(text).toContain('Runtime: 150 min')
    expect(text).not.toContain('Summary')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('without a clipboard, Copy my draft opens a dialog with the text to select', async () => {
    const { user, alert } = await conflict()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await user.click(within(alert).getByRole('button', { name: 'Copy my draft' }))
    const dialog = await screen.findByRole('dialog', { name: 'Copy your draft' })
    const textarea = within(dialog).getByRole('textbox', { name: 'Your draft' })
    expect(textarea).toHaveAttribute('readonly')
    const dump = (textarea as HTMLTextAreaElement).value
    expect(dump).toContain('Title: My new title')
    expect(dump).toContain('Runtime: 150 min')
    expect(screen.queryByText('Draft copied to the clipboard')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(field('Title')).toHaveValue('My new title')
  })

  it('a clipboard that rejects falls back to the same dialog', async () => {
    const { user, alert } = await conflict()
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await user.click(within(alert).getByRole('button', { name: 'Copy my draft' }))
    expect(await screen.findByRole('dialog', { name: 'Copy your draft' })).toBeInTheDocument()
    expect(screen.queryByText('Draft copied to the clipboard')).not.toBeInTheDocument()
  })

  it('Reload latest asks first; "Keep my draft" keeps editing with the draft', async () => {
    const { user, alert } = await conflict()
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByRole('heading', {
        name: 'Replace your unsaved changes with the latest version?',
      }),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep my draft' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(field('Title')).toHaveValue('My new title')
    expect(field('Runtime')).toHaveValue('150')
    expect(screen.getByRole('heading', { level: 1, name: /^Edit/ })).toBeInTheDocument()
  })

  it('confirming Reload latest refetches the item and shows it in view mode', async () => {
    const { router, user, alert } = await conflict()
    let gets = 0
    server.use(
      http.get(itemUrl, () => {
        gets++
        return HttpResponse.json({ ...matrix, title: 'Their title', version: 4 })
      }),
    )
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reload latest' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Their title' }),
    ).toBeInTheDocument()
    expect(gets).toBeGreaterThanOrEqual(1)
    expect(search(router)).toBe('')
    expect(screen.queryByText('My new title')).not.toBeInTheDocument()
  })

  // A failed background refetch must not replace the form with an error screen (ItemPage).
  it('a failed reload keeps the draft and says so', async () => {
    const { user, alert } = await conflict()
    server.use(http.get(itemUrl, () => problemResponse(500, 'internal_error')))
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reload latest' }))
    expect(await screen.findByText(/latest version could not be loaded/)).toBeInTheDocument()
    expect(field('Title')).toHaveValue('My new title')
  })

  it('a 404 on save says the item is gone and keeps the draft', async () => {
    mockPatch(() => problemResponse(404, 'not_found'))
    const { user } = await openForm()
    await retype(user, 'Title', 'Still here')
    await user.click(saveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(/deleted or moved to Trash/)
    expect(field('Title')).toHaveValue('Still here')
  })
})

describe('AT-09 save failures that are not conflicts', () => {
  const NOT_REACHED = /The server could not be reached/

  it('a network error keeps the draft, offers Retry and is not a conflict', async () => {
    const calls = mockPatch(() => HttpResponse.error())
    const { user } = await openForm()
    await retype(user, 'Title', 'Offline edit')
    await user.click(saveButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(NOT_REACHED)
    expect(alert).not.toHaveTextContent(/Someone else/)
    expect(within(alert).queryByRole('button', { name: 'Copy my draft' })).not.toBeInTheDocument()
    expect(field('Title')).toHaveValue('Offline edit')
    expect(calls).toHaveLength(1)
  })

  it('Retry sends the request once per click and saves when the network is back', async () => {
    const calls = mockPatch((_call, n) =>
      n < 3
        ? HttpResponse.error()
        : HttpResponse.json({ ...matrix, title: 'Offline edit', version: 4 }),
    )
    const { user } = await openForm()
    await retype(user, 'Title', 'Offline edit')
    await user.click(saveButton())
    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(calls).toHaveLength(2))
    // Still failing: the banner is still there.
    await user.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Item saved')).toBeInTheDocument()
    expect(calls).toHaveLength(3)
    expect(calls.every((call) => call.ifMatch === '"i-3"')).toBe(true)
    expect(calls[2]?.body).toEqual({ title: 'Offline edit' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Offline edit' }),
    ).toBeInTheDocument()
  })

  it('a 500 is treated like a network failure: draft kept, Retry available', async () => {
    const calls = mockPatch((_call, n) =>
      n === 1
        ? problemResponse(500, 'internal_error')
        : HttpResponse.json({ ...matrix, title: 'Retry me', version: 4 }),
    )
    const { user } = await openForm()
    await retype(user, 'Title', 'Retry me')
    await user.click(saveButton())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(NOT_REACHED)
    expect(alert).not.toHaveTextContent(/Someone else/)
    expect(field('Title')).toHaveValue('Retry me')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Item saved')).toBeInTheDocument()
    expect(calls).toHaveLength(2)
  })
})

describe('AT-22 unsaved changes guard', () => {
  const sidebar = () => screen.getByRole('navigation', { name: 'Library' })

  async function openDirty(extra: Parameters<typeof openForm>[0] = {}) {
    localStorage.setItem('collection:tree-expanded', JSON.stringify([MEDIA, MOVIES, VEHICLES]))
    const opened = await openForm(extra)
    await opened.user.type(field('Title'), ' edited')
    return opened
  }

  it('leaving through the sidebar asks "Discard changes?" and Keep editing stays', async () => {
    const { router, user } = await openDirty()
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Discard changes?' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(field('Title')).toHaveValue('The Matrix edited')
    expect(pathname(router)).toBe(PATH)
    expect(search(router)).toBe('?edit=1')
  })

  it('Discard changes navigates to the other list', async () => {
    const { router, user } = await openDirty()
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(pathname(router)).toBe(`/lists/${MOTORBIKES}`))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^Edit/ })).not.toBeInTheDocument()
  })

  it('the Back link asks as well, and Discard goes back to the list', async () => {
    const { router, user } = await openDirty()
    await user.click(screen.getByRole('link', { name: /Back to Watchlist/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Discard changes?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(pathname(router)).toBe(PATH)
    await user.click(screen.getByRole('link', { name: /Back to Watchlist/ }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(pathname(router)).toBe(`/lists/${WATCHLIST}`))
    expect(search(router)).toBe('')
  })

  it('Cancel with changes asks too; Discard returns to view mode with the saved data', async () => {
    const { router, user } = await openDirty()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Discard changes?' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'The Matrix' })).toBeInTheDocument()
    expect(search(router)).toBe('')
  })

  it('no dialog when nothing changed', async () => {
    localStorage.setItem('collection:tree-expanded', JSON.stringify([MEDIA, MOVIES, VEHICLES]))
    const { router, user } = await openForm()
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    await waitFor(() => expect(pathname(router)).toBe(`/lists/${MOTORBIKES}`))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('no dialog after a successful save', async () => {
    mockPatch()
    localStorage.setItem('collection:tree-expanded', JSON.stringify([MEDIA, MOVIES, VEHICLES]))
    const { router, user } = await openForm()
    await user.type(field('Title'), '!')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    await waitFor(() => expect(pathname(router)).toBe(`/lists/${MOTORBIKES}`))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('changing the list filter (?q=) while editing does not ask', async () => {
    const { router, user } = await openDirty({ width: 1300 })
    const filter = await screen.findByRole('searchbox', { name: /filter/i })
    await user.type(filter, 'neo')
    await waitFor(() => expect(search(router)).toContain('q=neo'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(field('Title')).toHaveValue('The Matrix edited')
  })

  it('beforeunload is prevented while there are unsaved changes, and only then', async () => {
    const { user } = await openForm()
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(unload()).toBe(false)
    await user.type(field('Title'), '!')
    expect(unload()).toBe(true)
    await user.type(field('Title'), '{Backspace}')
    expect(unload()).toBe(false)
  })

  it('beforeunload is no longer prevented after leaving edit mode', async () => {
    mockPatch()
    const { user } = await openForm()
    await user.type(field('Title'), '!')
    await user.click(saveButton())
    await screen.findByText('Item saved')
    // Leaving edit mode is a navigation that finishes after the toast appears.
    await waitFor(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })
  })
})

describe('AT-05 edit mode and the list URL state', () => {
  it('entering and leaving edit mode keeps ?q= and ?sort=', async () => {
    const router = renderRouter(`${PATH}?q=neo&sort=title`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await screen.findByRole('heading', { level: 1, name: /^Edit/ })
    const entered = new URLSearchParams(search(router))
    expect(entered.get('q')).toBe('neo')
    expect(entered.get('sort')).toBe('title')
    expect(entered.get('edit')).toBe('1')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { level: 1, name: 'The Matrix' })
    const left = new URLSearchParams(search(router))
    expect(left.get('q')).toBe('neo')
    expect(left.get('sort')).toBe('title')
    expect(left.has('edit')).toBe(false)
  })

  it('the Back link keeps q and sort but never edit', async () => {
    await openForm({ search: '&q=neo&sort=title' })
    const href = screen.getByRole('link', { name: /Back to Watchlist/ }).getAttribute('href') ?? ''
    const url = new URL(href, location.origin)
    expect(url.pathname).toBe(`/lists/${WATCHLIST}`)
    expect(url.searchParams.get('q')).toBe('neo')
    expect(url.searchParams.get('sort')).toBe('title')
    expect(url.searchParams.has('edit')).toBe(false)
  })

  it('links to other items in the list do not carry edit=1', async () => {
    await openForm({ width: 1300, search: '&q=neo' })
    const main = within(screen.getByRole('main'))
    await main.findAllByRole('link', { name: /./ })
    await waitFor(() => {
      const itemLinks = main
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.includes('/items/'))
      expect(itemLinks.length).toBeGreaterThan(0)
      for (const link of itemLinks) {
        expect(link.getAttribute('href')).not.toContain('edit=1')
        expect(link.getAttribute('href')).toContain('q=neo')
      }
    })
  })
})
