import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { ToastProvider } from '../../components/ui'
import { exampleResponses } from '../../generated/examples'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { createTestQueryClient, mockViewport } from '../../test-utils'
import type { Item } from './api'

const LIST = '7c1e5a10-0000-4000-8000-000000000011'
const NEW_ID = '7c1e5a10-0000-4000-8000-000000000999'
const origin = location.origin
const createUrl = `${origin}/api/v1/lists/${LIST}/items`
const listItemsUrl = createUrl
const treeUrl = `${origin}/api/v1/tree`
const newItemUrl = `${origin}/api/v1/items/${NEW_ID}`

const matrix = exampleResponses.getItem.body as Item

function renderList(path = `/lists/${LIST}`) {
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

/** The item the server creates for a request body (a bare item of that title and kind). */
const created = (body: { title: string; kind?: string }) =>
  ({
    ...matrix,
    id: NEW_ID,
    title: body.title,
    kind: body.kind ?? 'generic',
    summary: null,
    status: null,
    metadata: {},
    version: 1,
  }) as Item

interface Posted {
  body: { title: string; kind?: string }
}

/** Records the POSTs and answers 201 with the created item; also serves it for the item page. */
function mockCreate() {
  const posts: Posted[] = []
  server.use(
    http.post(createUrl, async ({ request }) => {
      const body = (await request.json()) as Posted['body']
      posts.push({ body })
      server.use(http.get(newItemUrl, () => HttpResponse.json(created(body))))
      return HttpResponse.json(created(body), { status: 201 })
    }),
  )
  return posts
}

async function openDialog(path?: string) {
  const router = renderList(path)
  const user = userEvent.setup()
  const [add] = await screen.findAllByRole('button', { name: 'Add item' })
  await user.click(add!)
  const dialog = await screen.findByRole('dialog', { name: 'Add item' })
  return { router, user, dialog }
}

const titleInput = (dialog: HTMLElement) => within(dialog).getByLabelText(/^Title/)
const submit = (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) =>
  user.click(within(dialog).getByRole('button', { name: 'Create item' }))

describe('AT-05 add item dialog', () => {
  it('opens from "Add item" with a required Title and the Generic kind', async () => {
    const { dialog } = await openDialog()
    expect(titleInput(dialog)).toBeRequired()
    expect(titleInput(dialog)).toHaveValue('')
    expect(within(dialog).getByRole('combobox', { name: 'Kind' })).toHaveTextContent('Generic')
    expect(within(dialog).getByRole('button', { name: 'Create item' })).toBeInTheDocument()
  })

  it('an empty title shows "Enter a title." and sends nothing', async () => {
    const posts = mockCreate()
    const { user, dialog } = await openDialog()
    await submit(user, dialog)
    expect(await within(dialog).findByText('Enter a title.')).toBeInTheDocument()
    expect(titleInput(dialog)).toHaveAttribute('aria-invalid', 'true')
    expect(posts).toHaveLength(0)
    expect(screen.getByRole('dialog', { name: 'Add item' })).toBeInTheDocument()
  })

  it('a blank (spaces only) title is the same as empty', async () => {
    const posts = mockCreate()
    const { user, dialog } = await openDialog()
    await user.type(titleInput(dialog), '    ')
    await submit(user, dialog)
    expect(await within(dialog).findByText('Enter a title.')).toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it('typing clears the title error', async () => {
    const { user, dialog } = await openDialog()
    await submit(user, dialog)
    await within(dialog).findByText('Enter a title.')
    await user.type(titleInput(dialog), 'a')
    expect(within(dialog).queryByText('Enter a title.')).not.toBeInTheDocument()
  })

  it('a title over 300 characters is rejected before sending, 300 is accepted', async () => {
    const posts = mockCreate()
    const { user, dialog } = await openDialog()
    await user.click(titleInput(dialog))
    await user.paste('a'.repeat(301))
    await submit(user, dialog)
    expect(await within(dialog).findByText(/at most 300 characters/)).toBeInTheDocument()
    expect(posts).toHaveLength(0)

    await user.clear(titleInput(dialog))
    await user.paste('a'.repeat(300))
    await submit(user, dialog)
    await waitFor(() => expect(posts).toHaveLength(1))
  })

  it('POSTs { title, kind }, then opens the new item in edit mode', async () => {
    const posts = mockCreate()
    const { router, user, dialog } = await openDialog()
    await user.type(titleInput(dialog), '  Field notebook ')
    await submit(user, dialog)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit “Field notebook”' }),
    ).toBeInTheDocument()
    expect(posts).toHaveLength(1)
    expect(posts[0]?.body).toEqual({ title: 'Field notebook', kind: 'generic' })
    expect(router.state.location.pathname).toBe(`/lists/${LIST}/items/${NEW_ID}`)
    expect(router.state.location.search).toBe('?edit=1')
    expect(screen.queryByRole('dialog', { name: 'Add item' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Field notebook')
  })

  it('sends the chosen kind and shows that kind’s fields in the form', async () => {
    const posts = mockCreate()
    const { user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'Heat')
    await user.click(within(dialog).getByRole('combobox', { name: 'Kind' }))
    await user.click(await screen.findByRole('option', { name: 'Movie' }))
    await submit(user, dialog)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit “Heat”' }),
    ).toBeInTheDocument()
    expect(posts[0]?.body).toEqual({ title: 'Heat', kind: 'movie' })
    expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent('Movie')
    expect(screen.getByLabelText(/^Release year/)).toBeInTheDocument()
  })

  it('Enter in the title field submits', async () => {
    const posts = mockCreate()
    const { user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'By keyboard{Enter}')
    await waitFor(() => expect(posts).toHaveLength(1))
    expect(posts[0]?.body.title).toBe('By keyboard')
  })

  it('keeps the list’s ?q= and ?sort= on the new item URL', async () => {
    mockCreate()
    const { router, user, dialog } = await openDialog(`/lists/${LIST}?q=ma&sort=title`)
    await user.type(titleInput(dialog), 'Another')
    await submit(user, dialog)
    await screen.findByRole('heading', { level: 1, name: 'Edit “Another”' })
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('q')).toBe('ma')
    expect(params.get('sort')).toBe('title')
    expect(params.get('edit')).toBe('1')
  })

  it('refreshes the list items and the tree after creating', async () => {
    mockCreate()
    const gets = { items: 0, tree: 0 }
    server.use(
      http.get(listItemsUrl, () => {
        gets.items++
        return HttpResponse.json(exampleResponses.listItems.body as object)
      }),
      http.get(treeUrl, () => {
        gets.tree++
        return HttpResponse.json(exampleResponses.getTree.body as object)
      }),
    )
    const { user, dialog } = await openDialog()
    await waitFor(() => expect(gets.items).toBeGreaterThan(0))
    const before = { ...gets }
    await user.type(titleInput(dialog), 'Fresh')
    await submit(user, dialog)
    await screen.findByRole('heading', { level: 1, name: 'Edit “Fresh”' })
    await waitFor(() => expect(gets.items).toBeGreaterThan(before.items))
    await waitFor(() => expect(gets.tree).toBeGreaterThan(before.tree))
  })

  it('Cancel closes the dialog and sends nothing', async () => {
    const posts = mockCreate()
    const { router, user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'Never mind')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Add item' })).not.toBeInTheDocument()
    expect(posts).toHaveLength(0)
    expect(router.state.location.pathname).toBe(`/lists/${LIST}`)
  })

  it('a 422 on title shows under the Title field and keeps the dialog', async () => {
    server.use(
      http.post(createUrl, () =>
        problemResponse(422, 'validation_failed', {
          errors: [{ field: 'title', message: 'Title is too long.' }],
        }),
      ),
    )
    const { router, user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'Something')
    await submit(user, dialog)
    expect(await within(dialog).findByText('Title is too long.')).toBeInTheDocument()
    expect(titleInput(dialog)).toHaveAttribute('aria-invalid', 'true')
    expect(titleInput(dialog)).toHaveValue('Something')
    expect(router.state.location.pathname).toBe(`/lists/${LIST}`)
  })

  it('a network error shows an inline alert and keeps the dialog and the title', async () => {
    server.use(http.post(createUrl, () => HttpResponse.error()))
    const { router, user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'Offline item')
    await submit(user, dialog)
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent(/could not be reached/)
    expect(screen.getByRole('dialog', { name: 'Add item' })).toBeInTheDocument()
    expect(titleInput(dialog)).toHaveValue('Offline item')
    expect(router.state.location.pathname).toBe(`/lists/${LIST}`)
  })

  it('after a network error, submitting again can succeed', async () => {
    let calls = 0
    server.use(
      http.post(createUrl, async ({ request }) => {
        calls++
        if (calls === 1) return HttpResponse.error()
        const body = (await request.json()) as Posted['body']
        server.use(http.get(newItemUrl, () => HttpResponse.json(created(body))))
        return HttpResponse.json(created(body), { status: 201 })
      }),
    )
    const { user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'Second try')
    await submit(user, dialog)
    await within(dialog).findByRole('alert')
    await submit(user, dialog)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit “Second try”' }),
    ).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('a 409 (list gone) is explained inline', async () => {
    server.use(http.post(createUrl, () => problemResponse(409, 'list_in_trash')))
    const { user, dialog } = await openDialog()
    await user.type(titleInput(dialog), 'Too late')
    await submit(user, dialog)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/no longer exists|Trash/)
  })
})
