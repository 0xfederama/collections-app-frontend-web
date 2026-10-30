import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ID, openTree, pickRowAction, seedTree, sidebar } from '../tree/testing'

const main = () => screen.getByRole('main')

async function openList(id: string, tree = seedTree()) {
  const view = await openTree(`/lists/${id}`, tree)
  await within(main()).findByRole('heading', { level: 1 })
  return view
}

async function openTypeMenu(user: Awaited<ReturnType<typeof openList>>['user'], current: RegExp) {
  await user.click(await within(main()).findByRole('button', { name: /^More actions for/ }))
  await user.click(await screen.findByRole('menuitem', { name: current }))
}

async function pickType(user: Awaited<ReturnType<typeof openList>>['user'], name: string) {
  const option = await screen.findByRole('menuitemradio', { name })
  act(() => option.focus())
  await user.keyboard('{Enter}')
}

describe('F008-W5 list type in the "…" menu', () => {
  it('the title stands alone: no type chip next to it', async () => {
    await openList(ID.watchlist)
    expect(within(main()).queryByRole('button', { name: /^Type:/ })).not.toBeInTheDocument()
  })

  it('asks before clearing the type fields of a list with items, and not for an empty one', async () => {
    const { user, backend } = await openList(ID.watchlist)

    await openTypeMenu(user, /^Type: Movie/)
    await pickType(user, 'Vehicles')
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('permanently clears')
    expect(dialog).toHaveTextContent('12 items')
    expect(dialog).toHaveTextContent('trashed ones included')
    // Cancelling sends nothing; the client never clears or rewrites items itself.
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(backend.writes()).toHaveLength(0)

    await openTypeMenu(user, /^Type: Movie/)
    await pickType(user, 'Vehicles')
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Clear details and change',
      }),
    )
    await waitFor(() => expect(backend.writes('PATCH')).toHaveLength(1))
    const [patch] = backend.writes('PATCH')
    expect(patch?.path).toBe(`/api/v1/lists/${ID.watchlist}`)
    expect(patch?.ifMatch).toBe('"l-2"')
    expect(patch?.body).toEqual({ type: 'vehicle' })
    expect(backend.writes()).toHaveLength(1)

    // An empty list changes type at once, with no warning.
    await user.click(within(sidebar()).getByRole('treeitem', { name: /^Ideas/ }))
    await openTypeMenu(user, /^Type: No type/)
    await pickType(user, 'Wishlist')
    await waitFor(() => expect(backend.writes('PATCH')).toHaveLength(2))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(backend.writes('PATCH')[1]?.body).toEqual({ type: 'wishlist' })
  })

  it('the Rename dialog of a list only renames', async () => {
    const { user } = await openList(ID.watchlist)
    await pickRowAction(user, 'Watchlist', 'Rename')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Type' })).not.toBeInTheDocument()
  })
})

describe('F002-W2 list description, edited in place', () => {
  const placeholder = () => within(main()).findByRole('button', { name: 'Add a description' })
  const editor = () => within(main()).findByRole('textbox', { name: 'Description' })

  it('click the placeholder, write, ✓ saves a trimmed text with If-Match', async () => {
    const { user, backend } = await openList(ID.wishlist)
    await user.click(await placeholder())
    const field = await editor()
    expect(field).toHaveValue('')
    await user.type(field, '  Things I want  ')
    await user.click(within(main()).getByRole('button', { name: 'Save description' }))

    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Description' })).toBeNull())
    const [patch] = backend.writes('PATCH', `/api/v1/lists/${ID.wishlist}`)
    expect(patch?.ifMatch).toBe('"l-5"')
    expect(patch?.body).toEqual({ description: 'Things I want' })
    expect(await screen.findByText('Description saved')).toBeInTheDocument()
    expect(await within(main()).findByText('Things I want')).toBeInTheDocument()
  })

  it('Enter writes a new line, Ctrl+Enter saves, an emptied text sends null', async () => {
    const tree = seedTree()
    tree.lists.find((l) => l.id === ID.wishlist)!.description = 'Old text'
    const { user, backend } = await openList(ID.wishlist, tree)
    await user.click(await within(main()).findByText('Old text'))
    const field = await editor()
    expect(field).toHaveValue('Old text')
    await user.type(field, '{Enter}more')
    expect(field).toHaveValue('Old text\nmore')
    expect(backend.writes()).toHaveLength(0)

    await user.clear(field)
    await user.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(() => expect(backend.writes('PATCH')).toHaveLength(1))
    expect(backend.writes('PATCH')[0]?.body).toEqual({ description: null })
  })

  it('Esc and ✕ cancel without a request, and the Edit description button opens the editor', async () => {
    const tree = seedTree()
    tree.lists.find((l) => l.id === ID.wishlist)!.description = 'Keep'
    const { user, backend } = await openList(ID.wishlist, tree)
    await user.click(await within(main()).findByRole('button', { name: 'Edit description' }))
    await user.type(await editor(), ' changed')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument()
    expect(within(main()).getByText('Keep')).toBeInTheDocument()

    await user.click(within(main()).getByRole('button', { name: 'Edit description' }))
    await user.type(await editor(), ' again')
    await user.click(within(main()).getByRole('button', { name: 'Cancel editing description' }))
    expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument()
    expect(backend.writes()).toHaveLength(0)
  })

  it('a 412 keeps the draft and offers Copy draft and Reload latest', async () => {
    const { user, backend } = await openList(ID.wishlist)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(await placeholder())
    const field = await editor()
    await user.type(field, 'Mine')
    const list = backend.state.lists.find((l) => l.id === ID.wishlist)!
    list.description = 'Theirs'
    list.version = 6

    await user.click(within(main()).getByRole('button', { name: 'Save description' }))
    const alert = await within(main()).findByRole('alert')
    expect(alert).toHaveTextContent('Someone else changed this list')
    expect(field).toHaveValue('Mine')

    await user.click(within(alert).getByRole('button', { name: 'Copy draft' }))
    expect(writeText).toHaveBeenCalledWith('Mine')

    await user.click(within(alert).getByRole('button', { name: 'Reload latest' }))
    await waitFor(() => expect(field).toHaveValue('Theirs'))
    expect(backend.writes('PATCH')).toHaveLength(1)
  })

  it('F007-W10 blocks saving above 64 KiB (bytes, not characters) without a request', async () => {
    const { user, backend } = await openList(ID.wishlist)
    await user.click(await placeholder())
    await user.click(await editor())
    // 2 bytes per character: 33000 characters are 66000 bytes, over 65536.
    await user.paste('é'.repeat(33_000))
    expect(within(main()).getByRole('alert')).toHaveTextContent('the limit is 64.0 KB')
    expect(within(main()).getByRole('button', { name: 'Save description' })).toBeDisabled()
    expect(backend.writes()).toHaveLength(0)
  })
})

describe('F002-W2 sidebar "New" button', () => {
  it('is one button after the last list, and the row menus no longer offer Edit description', async () => {
    const { user } = await openTree()
    const tree = within(sidebar()).getByRole('tree')
    const newButton = within(sidebar()).getByRole('button', { name: 'New' })
    expect(tree.compareDocumentPosition(newButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(newButton)
    expect(await screen.findByRole('menuitem', { name: 'Folder' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'List' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(within(sidebar()).getByRole('button', { name: 'More actions for Wishlist' }))
    await screen.findByRole('menuitem', { name: 'Rename' })
    expect(screen.queryByRole('menuitem', { name: 'Edit description' })).not.toBeInTheDocument()
  })
})

describe('F018-W1 list icon from the header and the sidebar', () => {
  const iconDialog = (name: string) => screen.findByRole('dialog', { name: `List icon · ${name}` })

  it('the header icon is a keyboard-reachable button named "Change icon" that opens the icon dialog', async () => {
    const { user, backend } = await openList(ID.watchlist)
    const button = within(main()).getByRole('button', { name: 'Change icon' })
    // The heading keeps the list name only; the button is not part of it.
    expect(within(main()).getByRole('heading', { level: 1, name: 'Watchlist' })).toBeInTheDocument()
    act(() => button.focus())
    await user.keyboard('{Enter}')
    const dialog = await iconDialog('Watchlist')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(backend.writes()).toHaveLength(0)
  })

  it('saving the header icon dialog sends If-Match from the version the list had when it opened', async () => {
    const { user, backend } = await openList(ID.watchlist)
    await user.click(within(main()).getByRole('button', { name: 'Change icon' }))
    const dialog = await iconDialog('Watchlist')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(backend.writes('PATCH')).toHaveLength(1))
    const [patch] = backend.writes('PATCH')
    expect(patch?.path).toBe(`/api/v1/lists/${ID.watchlist}`)
    expect(patch?.ifMatch).toBe('"l-2"')
    expect(Object.keys(patch?.body as object).sort()).toEqual(['icon', 'icon_color'])
  })

  it('the header "…" menu no longer offers "Change icon" but keeps the Type entry', async () => {
    const { user } = await openList(ID.watchlist)
    await user.click(await within(main()).findByRole('button', { name: /^More actions for/ }))
    expect(await screen.findByRole('menuitem', { name: /^Type: Movie/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Change icon' })).not.toBeInTheDocument()
  })

  it('a sidebar list row menu offers "Change icon", which opens the same dialog', async () => {
    const { user, backend } = await openList(ID.watchlist)
    await pickRowAction(user, 'Watchlist', 'Change icon')
    const dialog = await iconDialog('Watchlist')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(backend.writes()).toHaveLength(0)
  })

  it('a folder row menu does not offer "Change icon"', async () => {
    const { user } = await openList(ID.watchlist)
    await user.click(
      await within(sidebar()).findByRole('button', { name: 'More actions for Media' }),
    )
    await screen.findByRole('menuitem', { name: 'Rename' })
    expect(screen.queryByRole('menuitem', { name: 'Change icon' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
  })
})

describe('F019 list title renamed in place', () => {
  it('click the title, type, Enter: one PATCH of the name; Esc sends nothing', async () => {
    const { user, backend } = await openList(ID.watchlist)

    await user.click(within(main()).getByRole('button', { name: /^Watchlist/ }))
    const input = await within(main()).findByRole('textbox', { name: 'List name' })
    await user.keyboard('{Escape}')
    expect(backend.writes()).toHaveLength(0)
    expect(input).not.toBeInTheDocument()

    await user.click(within(main()).getByRole('button', { name: /^Watchlist/ }))
    const field = await within(main()).findByRole('textbox', { name: 'List name' })
    await user.clear(field)
    await user.type(field, 'To watch{Enter}')
    await waitFor(() => expect(backend.writes('PATCH')).toHaveLength(1))
    const [patch] = backend.writes('PATCH')
    expect(patch?.path).toBe(`/api/v1/lists/${ID.watchlist}`)
    expect(patch?.body).toEqual({ name: 'To watch' })
    expect(await within(main()).findByRole('button', { name: /^To watch/ })).toBeInTheDocument()
  })
})
