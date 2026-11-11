import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { problemResponse } from '../../../mocks/problems'
import { server } from '../../../mocks/server'
import { MEMBER_USER_ID, OWNER_USER_ID } from '../../../mocks/users'
import { apiUrl, ID, openTree, pickRowAction, seedTree, sidebar } from '../treeTestKit'

/** Media shared with Alice (owned by me). */
function sharedWithAlice() {
  const tree = seedTree()
  const media = tree.folders.find((f) => f.id === ID.media)!
  media.shared = true
  media.member_user_ids = [MEMBER_USER_ID]
  return tree
}

/** Vehicles owned by Alice and shared with me. */
function sharedWithMe() {
  const tree = seedTree()
  const vehicles = tree.folders.find((f) => f.id === ID.vehicles)!
  vehicles.owner_user_id = MEMBER_USER_ID
  vehicles.shared = true
  vehicles.member_user_ids = [OWNER_USER_ID]
  return tree
}

const menuItems = async (user: Awaited<ReturnType<typeof openTree>>['user'], name: string) => {
  await user.click(
    await within(sidebar()).findByRole('button', { name: `More actions for ${name}` }),
  )
  const menu = await screen.findByRole('menu')
  return within(menu)
    .getAllByRole('menuitem')
    .map((el) => el.textContent)
}

const dialog = () => screen.findByRole('dialog')
const email = async () => within(await dialog()).findByRole('textbox', { name: 'Email' })

describe('F-027 W3 sharing: owner', () => {
  it('shares by email, sends the email and lists the new member', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Media', 'Share…')
    const dlg = await dialog()
    expect(within(dlg).getByText('Share ‘Media’')).toBeInTheDocument()
    expect(within(dlg).getAllByText('Owner').length).toBeGreaterThan(0)
    await user.type(await email(), 'alice@dev.test')
    await user.click(within(dlg).getByRole('button', { name: 'Share' }))

    expect(await screen.findByText('Shared with Alice')).toBeInTheDocument()
    expect(backend.writes('POST', `/api/v1/folders/${ID.media}/members`)[0]?.body).toEqual({
      email: 'alice@dev.test',
    })
    expect(await within(dlg).findByRole('button', { name: 'Remove Alice' })).toBeInTheDocument()
    expect(within(dlg).getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument()
  })

  it('shows the unknown-email message and keeps the typed email', async () => {
    const { user } = await openTree()
    await pickRowAction(user, 'Media', 'Share…')
    const dlg = await dialog()
    await user.type(await email(), 'nobody@dev.test')
    await user.click(within(dlg).getByRole('button', { name: 'Share' }))
    expect(await within(dlg).findByRole('alert')).toHaveTextContent(
      'No one with this email has signed in to Collections yet. Ask them to open Collections once, then try again.',
    )
    expect(await email()).toHaveValue('nobody@dev.test')
  })

  it('blocks your own email before sending anything', async () => {
    const { user, backend } = await openTree()
    await pickRowAction(user, 'Media', 'Share…')
    const dlg = await dialog()
    await user.type(await email(), 'Owner@dev.test')
    await user.click(within(dlg).getByRole('button', { name: 'Share' }))
    expect(await within(dlg).findByRole('alert')).toHaveTextContent('That’s your own email.')
    expect(backend.writes('POST', `/api/v1/folders/${ID.media}/members`)).toHaveLength(0)
  })

  it('removes a member', async () => {
    const { user, backend } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Media', 'Share…')
    const dlg = await dialog()
    await user.click(await within(dlg).findByRole('button', { name: 'Remove Alice' }))
    expect(await screen.findByText('Removed Alice')).toBeInTheDocument()
    expect(
      backend.writes('DELETE', `/api/v1/folders/${ID.media}/members/${MEMBER_USER_ID}`),
    ).toHaveLength(1)
    await waitFor(() =>
      expect(within(dlg).queryByRole('button', { name: 'Remove Alice' })).not.toBeInTheDocument(),
    )
  })

  it('stops sharing after a confirm and removes every member', async () => {
    const { user, backend } = await openTree('/', sharedWithAlice())
    await pickRowAction(user, 'Media', 'Share…')
    await user.click(await within(await dialog()).findByRole('button', { name: 'Stop sharing' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText('Stop sharing ‘Media’?')).toBeInTheDocument()
    expect(
      within(confirm).getByText(
        '1 person loses access to it. Everything in it stays in your folder.',
      ),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Stop sharing' }))
    expect(await screen.findByText('Stopped sharing ‘Media’')).toBeInTheDocument()
    expect(backend.writes('DELETE')).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each([
    [403, 'forbidden', 'Only the owner of ‘Media’ can change who it’s shared with.'],
    [409, 'folder_not_top_level', 'Only top-level folders can be shared.'],
  ])('shows the %i message', async (status, code, message) => {
    const { user } = await openTree()
    server.use(
      http.post(apiUrl(`/api/v1/folders/${ID.media}/members`), () => problemResponse(status, code)),
    )
    await pickRowAction(user, 'Media', 'Share…')
    const dlg = await dialog()
    await user.type(await email(), 'alice@dev.test')
    await user.click(within(dlg).getByRole('button', { name: 'Share' }))
    expect(await within(dlg).findByRole('alert')).toHaveTextContent(message)
    expect(await email()).toHaveValue('alice@dev.test')
  })

  it('offers a retry on a network failure and closes when the folder is gone (404)', async () => {
    const { user } = await openTree()
    server.use(http.post(apiUrl(`/api/v1/folders/${ID.media}/members`), () => Response.error()))
    await pickRowAction(user, 'Media', 'Share…')
    const dlg = await dialog()
    await user.type(await email(), 'alice@dev.test')
    await user.click(within(dlg).getByRole('button', { name: 'Share' }))
    expect(await within(dlg).findByRole('button', { name: 'Retry' })).toBeInTheDocument()

    server.use(
      http.post(apiUrl(`/api/v1/folders/${ID.media}/members`), () =>
        problemResponse(404, 'not_found'),
      ),
    )
    await user.click(within(dlg).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('That folder no longer exists')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('F-027 W3 sharing: member', () => {
  it('sees the people read-only', async () => {
    const { user } = await openTree('/', sharedWithMe())
    await pickRowAction(user, 'Vehicles', 'People…')
    const dlg = await dialog()
    expect(await within(dlg).findByText('Alice')).toBeInTheDocument()
    expect(within(dlg).getAllByText('Owner').length).toBeGreaterThan(0)
    expect(within(dlg).queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument()
    expect(within(dlg).queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument()
    expect(within(dlg).queryByRole('button', { name: 'Stop sharing' })).not.toBeInTheDocument()
  })

  it('leaves the folder and goes home when the open list was inside it', async () => {
    const { user, backend, router } = await openTree(`/lists/${ID.motorbikes}`, sharedWithMe())
    await pickRowAction(user, 'Vehicles', 'Leave folder')
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText('Leave ‘Vehicles’?')).toBeInTheDocument()
    expect(
      await within(confirm).findByText(
        'It disappears from your collection. What you added stays in it, owned by Alice.',
      ),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Leave folder' }))
    expect(await screen.findByText('Left ‘Vehicles’')).toBeInTheDocument()
    expect(
      backend.writes('DELETE', `/api/v1/folders/${ID.vehicles}/members/${OWNER_USER_ID}`),
    ).toHaveLength(1)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByText('That item no longer exists')).not.toBeInTheDocument()
  })
})

describe('F-027 W3 sharing: menu rights', () => {
  it('a folder shared with me has Rename and People but no Move or Delete', async () => {
    const { user } = await openTree('/', sharedWithMe())
    const items = await menuItems(user, 'Vehicles')
    expect(items).toContain('Rename')
    expect(items).toContain('People…')
    expect(items).toContain('Leave folder')
    expect(items).not.toContain('Move…')
    expect(items).not.toContain('Delete')
    expect(items).not.toContain('Share…')
  })

  it('a shared folder I own has Share and Delete but no Move', async () => {
    const { user } = await openTree('/', sharedWithAlice())
    const items = await menuItems(user, 'Media')
    expect(items).toContain('Share…')
    expect(items).toContain('Delete')
    expect(items).not.toContain('Move…')
  })

  it('a private folder I own keeps Move; a nested folder has no Share', async () => {
    const { user } = await openTree()
    expect(await menuItems(user, 'Gear')).toEqual(
      expect.arrayContaining(['Share…', 'Move…', 'Delete']),
    )
    await user.keyboard('{Escape}')
    const nested = await menuItems(user, 'Movies')
    expect(nested).toContain('Move…')
    expect(nested).not.toContain('Share…')
    expect(nested).not.toContain('People…')
  })
})
