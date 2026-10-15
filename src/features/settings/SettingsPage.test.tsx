import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createSettingsBackend } from '../../mocks/devSettings'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'

const settingsUrl = `${location.origin}/api/v1/settings`

const field = (name: string) => screen.getByLabelText(new RegExp(`^${name}( \\*)?$`))
const save = () => screen.getByRole('button', { name: 'Save settings' })

async function openSettings() {
  mockViewport(1280)
  const user = userEvent.setup()
  renderAt('/settings')
  await screen.findByRole('heading', { level: 1, name: 'Settings' })
  await screen.findByRole('button', { name: 'Save settings' })
  return user
}

interface Patch {
  ifMatch: string | null
  body: Record<string, unknown>
}

/** Wraps a PATCH recorder in front of the stateful backend. */
function mountBackend(start?: Parameters<typeof createSettingsBackend>[0]) {
  const backend = createSettingsBackend(start)
  const patches: Patch[] = []
  server.use(
    http.patch(settingsUrl, async ({ request }) => {
      patches.push({
        ifMatch: request.headers.get('If-Match'),
        body: (await request.clone().json()) as Record<string, unknown>,
      })
      return undefined // fall through to the backend handlers
    }),
    ...backend.handlers,
  )
  return { backend, patches }
}

async function retype(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  const input = field(label)
  await user.clear(input)
  if (text) await user.type(input, text)
}

describe('W-13 settings: saving', () => {
  it('shows the loaded values and keeps Save disabled when nothing changed', async () => {
    mountBackend()
    await openSettings()
    expect(field('Workspace name')).toHaveValue('Our Collection')
    expect(field('Streaming country')).toHaveValue('Italy (IT)')
    expect(field('Description history limit')).toHaveValue('20')
    expect(save()).toBeDisabled()
  })

  it('PATCHes only the changed field with If-Match "s-4", then shows the toast and updates the sidebar', async () => {
    const { patches, backend } = mountBackend({
      workspace_name: 'Our Collection',
      streaming_country_code: 'IT',
      markdown_history_limit: 20,
      version: 4,
    })
    const user = await openSettings()
    const sidebar = screen.getByRole('navigation', { name: 'Library' })
    expect(await within(sidebar).findByRole('link', { name: 'Our Collection' })).toBeInTheDocument()

    await retype(user, 'Workspace name', 'Casa')
    expect(save()).toBeEnabled()
    await user.click(save())

    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(patches).toEqual([{ ifMatch: '"s-4"', body: { workspace_name: 'Casa' } }])
    expect(backend.settings.version).toBe(5)
    expect(await within(sidebar).findByRole('link', { name: 'Casa' })).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('a second save uses the new version', async () => {
    const { patches } = mountBackend({
      workspace_name: 'A',
      streaming_country_code: 'IT',
      markdown_history_limit: 20,
      version: 4,
    })
    const user = await openSettings()
    await retype(user, 'Description history limit', '0')
    await user.click(save())
    await waitFor(() => expect(patches).toHaveLength(1))
    await waitFor(() => expect(save()).toBeDisabled())
    await retype(user, 'Description history limit', '200')
    await user.click(save())
    await waitFor(() => expect(patches).toHaveLength(2))
    expect(patches[0]).toEqual({ ifMatch: '"s-4"', body: { markdown_history_limit: 0 } })
    expect(patches[1]).toEqual({ ifMatch: '"s-5"', body: { markdown_history_limit: 200 } })
  })

  it('changing the country through the picker sends the ISO code', async () => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await user.type(field('Streaming country'), 'france{Enter}')
    await user.click(save())
    await screen.findByText('Settings saved')
    expect(patches[0]!.body).toEqual({ streaming_country_code: 'FR' })
  })

  it('reverting an edit disables Save again', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'X')
    expect(save()).toBeEnabled()
    await retype(user, 'Workspace name', 'Our Collection')
    expect(save()).toBeDisabled()
  })
})

describe('W-13 settings: history limit validation', () => {
  it.each(['-1', '201', '1.5', 'abc'])('rejects %j without a request', async (text) => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Description history limit', text)
    await user.click(save())
    expect(await screen.findByText(/whole number from 0 to 200/)).toBeInTheDocument()
    expect(field('Description history limit')).toHaveFocus()
    expect(field('Description history limit')).toBeInvalid()
    expect(patches).toEqual([])
  })

  it.each([
    ['0', 0],
    ['200', 200],
  ])('accepts %s', async (text, expected) => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Description history limit', text)
    await user.click(save())
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(patches[0]!.body).toEqual({ markdown_history_limit: expected })
  })

  it('rejects an empty workspace name without a request', async () => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', '   ')
    await user.click(save())
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(field('Workspace name')).toHaveFocus()
    expect(patches).toEqual([])
  })

  it('clears a field error when the field is edited', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Description history limit', 'abc')
    await user.click(save())
    await screen.findByText(/whole number/)
    await user.type(field('Description history limit'), '{Backspace}{Backspace}{Backspace}5')
    expect(screen.queryByText(/whole number/)).not.toBeInTheDocument()
  })
})

describe('W-13 settings: server errors', () => {
  it.each([
    ['workspace_name', 'Workspace name'],
    ['streaming_country_code', 'Streaming country'],
    ['markdown_history_limit', 'Description history limit'],
  ])('422 on %s lands on the input and focuses it', async (apiField, label) => {
    mountBackend()
    server.use(
      http.patch(settingsUrl, () =>
        problemResponse(422, 'validation_failed', {
          errors: [{ field: apiField, message: 'server says no' }],
        }),
      ),
    )
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Changed')
    await user.click(save())
    expect(await screen.findByText('server says no')).toBeInTheDocument()
    expect(field(label)).toHaveFocus()
    expect(field(label)).toBeInvalid()
    expect(field('Workspace name')).toHaveValue('Changed')
  })

  it('a 422 on an unknown field shows a general message and keeps the draft', async () => {
    mountBackend()
    server.use(
      http.patch(settingsUrl, () =>
        problemResponse(422, 'validation_failed', {
          errors: [{ field: 'mystery', message: 'odd' }],
        }),
      ),
    )
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Changed')
    await user.click(save())
    expect(await screen.findByText('mystery: odd')).toBeInTheDocument()
    expect(field('Workspace name')).toHaveValue('Changed')
  })

  it('network error shows Retry, keeps the draft, and Retry re-sends', async () => {
    const { patches } = mountBackend()
    let fail = true
    server.use(
      http.patch(settingsUrl, () => {
        if (fail) return HttpResponse.error()
        return undefined
      }),
    )
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Casa')
    await user.click(save())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be reached/)
    expect(field('Workspace name')).toHaveValue('Casa')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(patches.at(-1)).toEqual({ ifMatch: '"s-1"', body: { workspace_name: 'Casa' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('W-13 settings: conflict (412)', () => {
  async function conflict() {
    const { backend } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'My name')
    await user.type(field('Description history limit'), '0')
    backend.bumpExternally({ workspace_name: 'Theirs', markdown_history_limit: 99 })
    await user.click(save())
    const banner = await screen.findByRole('alert')
    return { user, banner, backend }
  }

  it('keeps the draft, shows the banner, disables Save', async () => {
    const { banner } = await conflict()
    expect(banner).toHaveTextContent(/Someone else changed the settings/)
    expect(field('Workspace name')).toHaveValue('My name')
    expect(field('Description history limit')).toHaveValue('200')
    expect(save()).toBeDisabled()
    expect(within(banner).getByRole('button', { name: 'Copy my draft' })).toBeInTheDocument()
  })

  it('Copy my draft writes the changed fields to the clipboard', async () => {
    const { user, banner } = await conflict()
    await user.click(within(banner).getByRole('button', { name: 'Copy my draft' }))
    expect(await screen.findByText('Draft copied to the clipboard')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(
      'Workspace name: My name\nDescription history limit: 200',
    )
    expect(field('Workspace name')).toHaveValue('My name')
  })

  it('Reload latest asks first; cancelling keeps the draft', async () => {
    const { user, banner } = await conflict()
    await user.click(within(banner).getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Keep my draft' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(field('Workspace name')).toHaveValue('My name')
  })

  it('Reload latest replaces the draft with the fresh values after confirming', async () => {
    const { user, banner, backend } = await conflict()
    await user.click(within(banner).getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reload latest' }))
    await waitFor(() => expect(field('Workspace name')).toHaveValue('Theirs'))
    expect(field('Description history limit')).toHaveValue('99')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(save()).toBeDisabled()

    // The next save uses the reloaded version.
    await retype(user, 'Workspace name', 'Mine again')
    await user.click(save())
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(backend.settings.workspace_name).toBe('Mine again')
  })
})

describe('W-13 settings: load failure', () => {
  it('shows an error with Retry when settings cannot be loaded', async () => {
    let fail = true
    server.use(http.get(settingsUrl, () => (fail ? problemResponse(500, 'internal') : undefined)))
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/settings')
    const alert = await screen.findByText('Couldn’t load the settings.')
    expect(alert).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('button', { name: 'Save settings' })).toBeInTheDocument()
  })
})

describe('W-13 settings: unsaved changes guard', () => {
  it('asks before leaving with a dirty form; Keep editing stays', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Dirty')
    await user.click(screen.getByRole('link', { name: 'Trash' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(field('Workspace name')).toHaveValue('Dirty')
  })

  it('Discard changes proceeds to the next page', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Dirty')
    await user.click(screen.getByRole('link', { name: 'Trash' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Discard changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Trash' })).toBeInTheDocument()
  })

  it('does not ask when nothing changed', async () => {
    mountBackend()
    const user = await openSettings()
    await user.click(screen.getByRole('link', { name: 'Trash' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Trash' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not ask after a successful save', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Saved')
    await user.click(save())
    await screen.findByText('Settings saved')
    await user.click(screen.getByRole('link', { name: 'Trash' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Trash' })).toBeInTheDocument()
  })
})
