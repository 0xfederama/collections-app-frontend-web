import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
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

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const MOTORBIKES = '7c1e5a10-0000-4000-8000-000000000012'
const MEDIA = '7c1e5a10-0000-4000-8000-000000000001'
const MOVIES = '7c1e5a10-0000-4000-8000-000000000002'
const VEHICLES = '7c1e5a10-0000-4000-8000-000000000003'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const itemUrl = `${location.origin}/api/v1/items/${ITEM}`

const matrix = exampleResponses.getItem.body as Item

type User = ReturnType<typeof userEvent.setup>

/** Opens the item (optionally overridden) in the shell and waits for its title. */
async function openItem(over: Partial<Item> = {}) {
  server.use(http.get(itemUrl, () => HttpResponse.json({ ...matrix, ...over })))
  mockViewport(1100)
  const router = createTestRouter([PATH])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await screen.findByRole('heading', { level: 1, name: over.title ?? 'The Matrix' })
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
      return HttpResponse.json({ ...matrix, ...call.body, version: matrix.version + calls.length })
    }),
  )
  return calls
}

const pen = (label: string) => screen.getByRole('button', { name: `Edit ${label}` })
const save = (label: string) => screen.getByRole('button', { name: `Save ${label}` })

/** Empty fields open their editor from "+ Add field". */
async function addField(user: User, entry: string) {
  await user.click(screen.getByRole('button', { name: 'Add field' }))
  await user.click(await screen.findByRole('menuitem', { name: entry }))
}

/** Uses the visible field pen for populated values; an empty field opens from Add field. */
async function editField(user: User, entry: string) {
  if (screen.queryByRole('button', { name: `Edit ${entry.toLowerCase()}` })) {
    await user.click(pen(entry.toLowerCase()))
  } else {
    await addField(user, entry)
  }
}

async function retype(user: User, input: HTMLElement, text: string) {
  await user.clear(input)
  if (text) await user.type(input, text)
}

describe('F002-W3 in-place fields: one PATCH per field', () => {
  it('title: the pen opens an input, Enter saves only { title } with the item If-Match, focus returns to the pen', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await user.click(pen('title'))
    const input = screen.getByRole('textbox', { name: /Title/ })
    expect(input).toHaveFocus()
    await retype(user, input, 'The Matrix Reloaded{Enter}')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'The Matrix Reloaded' }),
    ).toBeVisible()
    expect(calls).toEqual([{ ifMatch: '"i-3"', body: { title: 'The Matrix Reloaded' } }])
    await waitFor(() => expect(pen('title')).toHaveFocus())
  })

  it('clicking the value opens the editor; ✕ and Esc cancel without a request', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await user.click(screen.getByRole('heading', { level: 1, name: 'The Matrix' }))
    await user.type(screen.getByRole('textbox', { name: /Title/ }), ' edited')
    await user.click(screen.getByRole('button', { name: 'Cancel editing title' }))
    expect(screen.getByRole('heading', { level: 1, name: 'The Matrix' })).toBeVisible()

    await user.click(pen('title'))
    await user.type(screen.getByRole('textbox', { name: /Title/ }), ' edited{Escape}')
    expect(screen.getByRole('heading', { level: 1, name: 'The Matrix' })).toBeVisible()
    expect(calls).toHaveLength(0)
  })

  it('an empty title is refused on the input, with no request', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), '{Enter}')
    expect(await screen.findByText('Enter a title.')).toBeVisible()
    expect(calls).toHaveLength(0)
  })

  it('a type field sends the metadata object with that field changed', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await editField(user, 'Runtime')
    await retype(user, screen.getByRole('textbox', { name: 'Runtime' }), '140')
    await user.click(save('runtime'))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]?.ifMatch).toBe('"i-3"')
    expect(calls[0]?.body).toEqual({ metadata: { ...matrix.metadata, runtime_minutes: 140 } })
  })

  it('a second save uses the version the first one returned', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), 'One{Enter}')
    await screen.findByRole('heading', { level: 1, name: 'One' })
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), 'Two{Enter}')
    await screen.findByRole('heading', { level: 1, name: 'Two' })
    expect(calls.map((call) => call.ifMatch)).toEqual(['"i-3"', '"i-4"'])
  })

  it('streaming: a platform can be marked paid, and paid stays within platforms', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await editField(user, 'Streaming')
    const paid = screen.getByRole('group', { name: 'Paid platforms' })
    expect(within(paid).getByRole('button', { name: /Prime Video/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(within(paid).getByRole('button', { name: /Netflix/ }))
    await user.click(save('streaming'))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect((calls[0]?.body.metadata as Record<string, unknown>).streaming).toEqual({
      country: 'IT',
      platforms: ['Netflix', 'Prime Video'],
      paid_platforms: ['Prime Video', 'Netflix'],
    })
  })

  it('streaming: unticking a platform drops it, and the country comes from Settings (F011-W1)', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await editField(user, 'Streaming')
    // F011-W2: the platforms are a multi-choice dropdown, not a comma-separated field.
    await user.click(screen.getByRole('button', { name: /Netflix, Prime Video/ }))
    // The example has Netflix and Prime Video (paid); unticking Prime Video leaves Netflix.
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Prime Video/ }))
    // The menu stays open so several can be ticked; close it before reaching for the save button.
    await user.keyboard('{Escape}')
    await user.click(save('streaming'))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect((calls[0]?.body.metadata as Record<string, unknown>).streaming).toEqual({
      country: 'IT',
      platforms: ['Netflix'],
    })
  })

  it('streaming: the country is not asked on the item (F011-W1)', async () => {
    const { user } = await openItem()
    await editField(user, 'Streaming')
    expect(screen.queryByLabelText(/streaming country/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /country/i })).not.toBeInTheDocument()
  })

  it('streaming: a service we have no logo for can still be added (F011-W2)', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await editField(user, 'Streaming')
    await user.click(screen.getByRole('button', { name: /Netflix, Prime Video/ }))
    // Untick the two the example has.
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Netflix/ }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Prime Video/ }))
    await user.keyboard('{Escape}')
    await user.type(screen.getByRole('textbox', { name: 'Another service' }), 'Sky{Enter}')
    await user.click(save('streaming'))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect((calls[0]?.body.metadata as Record<string, unknown>).streaming).toEqual({
      country: 'IT',
      platforms: ['Sky'],
    })
  })
})

describe('F002-W3 "+ Add field" and price', () => {
  it('F009-W1 shows populated type fields and offers only empty fields', async () => {
    // A car whose type fields are all set: they are visible and absent from Add field (D-085).
    const { user } = await openItem({
      type: 'car',
      metadata: {
        make: 'Volkswagen',
        model: 'Golf',
        model_year: 2021,
        fuel_type: 'petrol',
        power_hp: 111,
      },
    })
    expect(screen.getByText('Volkswagen')).toBeVisible()
    expect(screen.getByText('Golf')).toBeVisible()
    expect(screen.getByText('2021')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Price', 'Website'])
    await user.click(within(menu).getByRole('menuitem', { name: 'Price' }))
    expect(await screen.findByRole('textbox', { name: 'Price' })).toBeVisible()
  })

  it('F009-W1 a movie offers no Price, a car does', async () => {
    const { user } = await openItem()
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Director', 'Website'])
  })

  it('opens the website editor from the menu', async () => {
    const { user } = await openItem()
    await addField(user, 'Website')
    expect(await screen.findByRole('textbox', { name: 'Website' })).toBeVisible()
  })

  it('Website: adds a website; an unusable address is refused on the input', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await addField(user, 'Website')
    const input = await screen.findByRole('textbox', { name: 'Website' })
    await user.type(input, 'ftp://nope{Enter}')
    expect(await screen.findByText(/starting with http/)).toBeVisible()
    expect(calls).toHaveLength(0)
    await retype(user, input, 'https://example.com/matrix{Enter}')
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]?.body).toEqual({ website: 'https://example.com/matrix' })
  })

  it('Price: a single price is { amount, currency }; a range is { min, max, currency }', async () => {
    const calls = mockPatch()
    const { user } = await openItem({ type: 'car', metadata: {} })
    await addField(user, 'Price')
    await user.type(await screen.findByRole('textbox', { name: 'Price' }), '1200{Enter}')
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]?.body).toEqual({ price: { amount: '1200.00', currency: 'EUR' } })
  })

  it('F008-W12 Add range reveals a second amount in the same field; Remove range goes back to single', async () => {
    const calls = mockPatch()
    const { user } = await openItem({ type: 'car', metadata: {} })
    await addField(user, 'Price')
    await user.type(await screen.findByRole('textbox', { name: 'Price' }), '900')
    await user.click(screen.getByRole('button', { name: 'Add range' }))
    expect(screen.getByRole('textbox', { name: 'Minimum price' })).toHaveValue('900')
    await user.click(screen.getByRole('button', { name: 'Remove range' }))
    expect(screen.getByRole('textbox', { name: 'Price' })).toHaveValue('900')
    await user.click(screen.getByRole('button', { name: 'Add range' }))
    await retype(user, screen.getByRole('textbox', { name: 'Minimum price' }), '1000')
    await user.type(screen.getByRole('textbox', { name: 'Maximum price' }), '1400{Enter}')
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]?.body).toEqual({
      price: { min: '1000.00', max: '1400.00', currency: 'EUR' },
    })
  })

  it('Price: the saved price reads without cents, and Remove price sends null', async () => {
    // The default responder answers with the example (a movie), so keep the type of this car.
    const calls = mockPatch((call) =>
      HttpResponse.json({ ...matrix, type: 'car', ...call.body, version: 4 }),
    )
    const { user } = await openItem({
      type: 'car',
      price: { min: '1200.50', max: '1200.50', currency: 'EUR' },
    })
    // A populated price is visible by default.
    expect(await screen.findByText(/^€\s?1,201$/)).toBeVisible()
    await user.click(pen('price'))
    await user.click(screen.getByRole('button', { name: 'Remove price' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]?.body).toEqual({ price: null })
    // The now-empty price leaves the details and is available to add again.
    expect(screen.queryByText(/^€\s?1,201$/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    expect(await screen.findByRole('menuitem', { name: 'Price' })).toBeVisible()
  })
})

describe('AT-05 in-place fields: server errors', () => {
  it('422 shows the message under the field, keeps the editor open and the text', async () => {
    mockPatch(() =>
      problemResponse(422, 'validation_failed', {
        errors: [{ field: 'metadata.runtime_minutes', message: 'Runtime is not plausible.' }],
      }),
    )
    const { user } = await openItem()
    await editField(user, 'Runtime')
    await retype(user, screen.getByRole('textbox', { name: 'Runtime' }), '140{Enter}')
    expect(await screen.findByText('Runtime is not plausible.')).toBeVisible()
    const input = screen.getByRole('textbox', { name: 'Runtime' })
    expect(input).toHaveValue('140')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('id', 'item-field-metadata-runtime_minutes')
  })
})

describe('AT-09 If-Match comes from the version the editor opened on', () => {
  it('another client changes the item after the editor opened: the save sends the old version, gets 412 and keeps the draft', async () => {
    const calls = mockPatch(() => problemResponse(412, 'version_conflict', { current_version: 7 }))
    const { user } = await openItem()
    await editField(user, 'Runtime')
    await user.click(screen.getByRole('button', { name: 'Cancel editing runtime' }))
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), 'My title')
    // The other person edits the runtime (version 7); a focus refetch brings it in.
    server.use(
      http.get(itemUrl, () =>
        HttpResponse.json({
          ...matrix,
          version: 7,
          metadata: { ...matrix.metadata, runtime_minutes: 150 },
        }),
      ),
    )
    window.dispatchEvent(new Event('visibilitychange'))
    await screen.findByText('150 min')
    await user.click(save('title'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else changed this item')
    expect(calls).toEqual([{ ifMatch: '"i-3"', body: { title: 'My title' } }])
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('My title')
  })

  it('our own save of another field while this editor is open moves its version forward', async () => {
    const calls = mockPatch()
    const { user } = await openItem()
    await editField(user, 'Runtime')
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), 'Reloaded')
    await retype(user, screen.getByRole('textbox', { name: 'Runtime' }), '140{Enter}')
    await waitFor(() => expect(calls).toHaveLength(1))
    await screen.findByText('140 min')
    await user.click(save('title'))
    await screen.findByRole('heading', { level: 1, name: 'Reloaded' })
    expect(calls.map((call) => call.ifMatch)).toEqual(['"i-3"', '"i-4"'])
  })
})

describe('AT-09 conflict on one field', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original)
    else Reflect.deleteProperty(navigator, 'clipboard')
  })

  async function conflict() {
    const calls = mockPatch(() => problemResponse(412, 'version_conflict', { current_version: 4 }))
    const { user } = await openItem()
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), 'My new title{Enter}')
    const alert = await screen.findByRole('alert')
    return { calls, user, alert }
  }

  it('keeps the draft, shows Copy draft and Reload latest, and blocks another save', async () => {
    const { calls, alert } = await conflict()
    expect(alert).toHaveTextContent('Someone else changed this item while you were editing')
    expect(within(alert).getByRole('button', { name: 'Copy draft' })).toBeVisible()
    expect(within(alert).getByRole('button', { name: 'Reload latest' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('My new title')
    expect(save('title')).toBeDisabled()
    // No automatic retry and no silent overwrite: one request, with the old version.
    expect(calls).toEqual([{ ifMatch: '"i-3"', body: { title: 'My new title' } }])
  })

  it('Copy draft puts the changed field on the clipboard; Reload latest refetches and closes the editor', async () => {
    const { user, alert } = await conflict()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await user.click(within(alert).getByRole('button', { name: 'Copy draft' }))
    expect(await screen.findByText('Draft copied to the clipboard')).toBeVisible()
    expect(writeText).toHaveBeenCalledWith('Title: My new title')

    server.use(
      http.get(itemUrl, () => HttpResponse.json({ ...matrix, title: 'Theirs', version: 4 })),
    )
    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Theirs' })).toBeVisible()
    expect(screen.queryByRole('textbox', { name: /Title/ })).not.toBeInTheDocument()
  })

  it('without a clipboard, Copy draft shows the text to select', async () => {
    const { user, alert } = await conflict()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await user.click(within(alert).getByRole('button', { name: 'Copy draft' }))
    expect(await screen.findByRole('textbox', { name: 'Your draft' })).toHaveValue(
      'Title: My new title',
    )
  })

  it('a network error keeps the draft and Retry saves once the network is back', async () => {
    let up = false
    const calls = mockPatch((call) =>
      up ? HttpResponse.json({ ...matrix, ...call.body, version: 4 }) : HttpResponse.error(),
    )
    const { user } = await openItem()
    await user.click(pen('title'))
    await retype(user, screen.getByRole('textbox', { name: /Title/ }), 'Offline title{Enter}')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('could not be reached')
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Offline title')
    up = true
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Offline title' })).toBeVisible()
    expect(calls).toHaveLength(2)
  })
})

describe('AT-22 leaving with an open field', () => {
  const sidebar = () => screen.getByRole('navigation', { name: 'Library' })

  async function openDirty() {
    localStorage.setItem('collection:tree-expanded', JSON.stringify([MEDIA, MOVIES, VEHICLES]))
    const opened = await openItem()
    await opened.user.click(pen('title'))
    await opened.user.type(screen.getByRole('textbox', { name: /Title/ }), ' edited')
    return opened
  }

  it('asks "Discard changes?", Keep editing stays with the draft, Discard leaves', async () => {
    const { router, user } = await openDirty()
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Discard changes?' })).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('The Matrix edited')
    expect(router.state.location.pathname).toBe(PATH)

    await user.click(within(sidebar()).getByRole('link', { name: /Motorbikes/ }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${MOTORBIKES}`))
  })

  it('does not ask when the field is open but unchanged, or after a save', async () => {
    mockPatch()
    localStorage.setItem('collection:tree-expanded', JSON.stringify([MEDIA, MOVIES, VEHICLES]))
    const { router, user } = await openItem()
    await user.click(pen('title'))
    await user.type(screen.getByRole('textbox', { name: /Title/ }), '!{Enter}')
    await screen.findByRole('heading', { level: 1, name: 'The Matrix!' })
    await user.click(pen('title'))
    await user.click(await within(sidebar()).findByRole('link', { name: /Motorbikes/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/lists/${MOTORBIKES}`))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('beforeunload is prevented only while a field holds changes', async () => {
    const { user } = await openItem()
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    await user.click(pen('title'))
    expect(unload()).toBe(false)
    await user.type(screen.getByRole('textbox', { name: /Title/ }), '!')
    expect(unload()).toBe(true)
    await user.type(screen.getByRole('textbox', { name: /Title/ }), '{Backspace}')
    expect(unload()).toBe(false)
  })
})
