import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createSettingsBackend } from '../../mocks/devSettings'
import type { Settings } from './api'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'

const settingsUrl = `${location.origin}/api/v1/settings`

const field = (name: string) => screen.getByLabelText(new RegExp(`^${name}( \\*)?$`))
const closeSettings = () => screen.getByRole('button', { name: 'Close' })

async function openSettings(pane = 'General') {
  mockViewport(1280)
  const user = userEvent.setup()
  renderAt('/settings')
  await screen.findByRole('dialog', { name: 'Settings' })
  await screen.findByLabelText(/Workspace name/)
  if (pane !== 'General') await user.click(screen.getByRole('button', { name: pane }))
  if (pane === 'Media') await screen.findByLabelText('Country')
  if (pane === 'About') await screen.findByRole('region', { name: 'About' })
  if (pane === 'Types & fields') await screen.findByRole('region', { name: 'Types & fields' })
  return user
}

interface Patch {
  ifMatch: string | null
  body: Record<string, unknown>
}

/** Wraps a PATCH recorder in front of the stateful backend. */
function mountBackend(start?: Partial<Settings>) {
  const backend = createSettingsBackend({
    workspace_name: 'Our Collection',
    streaming_country_code: 'IT',
    metadata_language: 'en-US',
    lookup_available: false,
    book_lookup_available: true,
    markdown_history_limit: 20,
    trash_retention_days: null,
    preferred_store: 'amazon',
    version: 1,
    ...start,
  })
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
  it('shows the loaded values and has no manual save control', async () => {
    mountBackend()
    const user = await openSettings()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(Array.from(dialog.querySelectorAll('h2')).map((heading) => heading.textContent)).toEqual(
      [
        'Settings',
        'General',
        'Country & language',
        'Books',
        'Types & fields',
        'Connection',
        'About',
      ],
    )
    expect(dialog.querySelector('#settings-movies-tv')?.parentElement).toHaveAttribute('hidden')
    expect(screen.getByLabelText(/Workspace name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description history limit/)).toBeInTheDocument()
    expect(field('Workspace name')).toHaveValue('Our Collection')
    expect(field('Description history limit')).toHaveValue('20')
    expect(screen.getByRole('combobox', { name: 'Delete trash automatically' })).toHaveTextContent(
      'Off',
    )
    await user.click(screen.getByRole('button', { name: 'Media' }))
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByLabelText(/Metadata language/)).toBeInTheDocument()
    expect(field('Country')).toHaveValue('Italy (IT)')
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument()
  })

  it('saves retention immediately from the settings snapshot and preserves other drafts', async () => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Still a draft')
    await user.click(screen.getByRole('combobox', { name: 'Delete trash automatically' }))
    await user.click(await screen.findByRole('option', { name: '7 days' }))
    await screen.findByText('Trash retention saved')
    expect(patches[0]).toEqual({ ifMatch: '"s-1"', body: { trash_retention_days: 7 } })
    expect(field('Workspace name')).toHaveValue('Still a draft')
    await user.click(closeSettings())
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(patches[1]).toEqual({ ifMatch: '"s-2"', body: { workspace_name: 'Still a draft' } })
  })

  it('finishes a pending retention save before saving other drafts and closing', async () => {
    const { patches } = mountBackend()
    let started!: () => void
    let release!: () => void
    const retentionStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    let delayRetention = true
    server.use(
      http.patch(settingsUrl, async () => {
        if (!delayRetention) return undefined
        delayRetention = false
        started()
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return undefined
      }),
    )
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Saved after retention')
    await user.click(screen.getByRole('combobox', { name: 'Delete trash automatically' }))
    await user.click(await screen.findByRole('option', { name: '7 days' }))
    await retentionStarted

    await user.click(closeSettings())
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()

    release()
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(patches).toEqual([
      { ifMatch: '"s-1"', body: { trash_retention_days: 7 } },
      { ifMatch: '"s-2"', body: { workspace_name: 'Saved after retention' } },
    ])
  })

  it('shows an externally configured retention value instead of displaying Off', async () => {
    mountBackend({
      workspace_name: 'Our Collection',
      streaming_country_code: 'IT',
      markdown_history_limit: 20,
      trash_retention_days: 365,
      version: 1,
    })
    await openSettings()
    expect(screen.getByRole('combobox', { name: 'Delete trash automatically' })).toHaveTextContent(
      'Current: 365 days',
    )
  })

  it('keeps a failed immediate retention draft and exposes the normal conflict recovery', async () => {
    const { backend, patches } = mountBackend()
    const user = await openSettings()
    backend.bumpExternally({ trash_retention_days: 30 })
    await user.click(screen.getByRole('combobox', { name: 'Delete trash automatically' }))
    await user.click(await screen.findByRole('option', { name: '7 days' }))
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Someone else changed the settings')
    expect(screen.getByRole('combobox', { name: 'Delete trash automatically' })).toHaveTextContent(
      '7 days',
    )
    expect(patches).toEqual([{ ifMatch: '"s-1"', body: { trash_retention_days: 7 } }])
    await user.click(within(banner).getByRole('button', { name: 'Reload latest' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Reload latest' }))
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Delete trash automatically' }),
      ).toHaveTextContent('30 days'),
    )
  })

  it('retries an immediate retention save with the same snapshot and keeps unrelated drafts', async () => {
    const { patches } = mountBackend()
    let fail = true
    let calls = 0
    server.use(
      http.patch(settingsUrl, () => {
        calls += 1
        if (fail) return HttpResponse.error()
        return undefined
      }),
    )
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Unsubmitted name')
    await user.click(screen.getByRole('combobox', { name: 'Delete trash automatically' }))
    await user.click(await screen.findByRole('option', { name: '30 days' }))
    const alert = await screen.findByRole('alert')
    expect(screen.getByRole('combobox', { name: 'Delete trash automatically' })).toHaveTextContent(
      '30 days',
    )
    expect(field('Workspace name')).toHaveValue('Unsubmitted name')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await screen.findByText('Trash retention saved')
    expect(calls).toBe(2)
    expect(patches).toEqual([{ ifMatch: '"s-1"', body: { trash_retention_days: 30 } }])
  })

  it('shows retention validation errors on the retention choice', async () => {
    mountBackend()
    server.use(
      http.patch(settingsUrl, () =>
        problemResponse(422, 'validation_failed', {
          errors: [{ field: 'trash_retention_days', message: 'server says no' }],
        }),
      ),
    )
    const user = await openSettings()
    await user.click(screen.getByRole('combobox', { name: 'Delete trash automatically' }))
    await user.click(await screen.findByRole('option', { name: '7 days' }))
    expect(await screen.findByText('server says no')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Delete trash automatically' })).toBeInvalid()
  })

  it('saves changed settings on close with the snapshot If-Match', async () => {
    const { patches, backend } = mountBackend({
      workspace_name: 'Our Collection',
      streaming_country_code: 'IT',
      markdown_history_limit: 20,
      trash_retention_days: null,
      version: 4,
    })
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Casa')
    await user.click(closeSettings())

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(patches).toEqual([{ ifMatch: '"s-4"', body: { workspace_name: 'Casa' } }])
    expect(backend.settings.version).toBe(5)
  })

  it('saves all changed form fields in one patch on close', async () => {
    const { patches } = mountBackend({
      workspace_name: 'A',
      streaming_country_code: 'IT',
      markdown_history_limit: 20,
      trash_retention_days: null,
      version: 4,
    })
    const user = await openSettings()
    await retype(user, 'Description history limit', '0')
    await retype(user, 'Workspace name', 'B')
    await user.click(closeSettings())
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(patches).toEqual([
      { ifMatch: '"s-4"', body: { workspace_name: 'B', markdown_history_limit: 0 } },
    ])
  })

  it('changing the country through the picker sends the ISO code', async () => {
    const { patches } = mountBackend()
    const user = await openSettings('Media')
    await user.type(field('Country'), 'france{Enter}')
    await user.click(closeSettings())
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(patches[0]!.body).toEqual({ streaming_country_code: 'FR' })
  })

  it('saves the metadata language through the settings snapshot', async () => {
    const { patches } = mountBackend({
      workspace_name: 'Our Collection',
      streaming_country_code: 'IT',
      metadata_language: 'en-US',
      lookup_available: true,
      markdown_history_limit: 20,
      trash_retention_days: null,
      version: 4,
    })
    const user = await openSettings('Media')
    const language = screen.getByRole('combobox', { name: 'Metadata language' })
    expect(language).toHaveTextContent('English (United States)')
    await user.click(language)
    await user.click(await screen.findByRole('option', { name: 'Italiano (Italia)' }))
    await user.click(closeSettings())
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(patches).toEqual([{ ifMatch: '"s-4"', body: { metadata_language: 'it-IT' } }])
  })

  it('F016 saves the default store, through the settings snapshot', async () => {
    const { patches } = mountBackend()
    const user = await openSettings('Media')
    await user.click(screen.getByRole('combobox', { name: 'Default store' }))
    await user.click(await screen.findByRole('option', { name: 'Kobo' }))
    await user.click(closeSettings())
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(patches).toEqual([{ ifMatch: '"s-1"', body: { preferred_store: 'kobo' } }])
  })

  it('F016-W1 credits Open Library for book details and covers in About', async () => {
    mountBackend()
    await openSettings('About')
    const about = screen.getByRole('region', { name: 'About' })
    expect(about).toHaveTextContent(
      'Book details and covers come from Open Library, an open project of the Internet Archive.',
    )
    expect(within(about).getByRole('link', { name: 'Open Library' })).toHaveAttribute(
      'href',
      'https://openlibrary.org/',
    )
    expect(within(about).getByRole('link', { name: 'Open Library' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
  })

  it('shows required TMDB and JustWatch attribution and external project links in About', async () => {
    mountBackend()
    await openSettings('About')
    const about = screen.getByRole('region', { name: 'About' })
    expect(within(about).getByRole('img', { name: 'TMDB' })).toBeInTheDocument()
    expect(about).toHaveTextContent(
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    )
    expect(within(about).getByRole('link', { name: 'JustWatch' })).toHaveAttribute(
      'href',
      'https://www.justwatch.com/',
    )
    expect(within(about).getByRole('link', { name: 'GitHub repository' })).toHaveAttribute(
      'href',
      'https://github.com/0xfederama/collections-app',
    )
    expect(within(about).getByRole('link', { name: 'Author profile' })).toHaveAttribute(
      'href',
      'https://github.com/0xfederama',
    )
  })

  it('reverting an edit closes without a request', async () => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'X')
    await retype(user, 'Workspace name', 'Our Collection')
    await user.click(closeSettings())
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    expect(patches).toEqual([])
  })

  it('offers keyboard reachable panes and the Types & fields pane', async () => {
    mountBackend()
    const user = await openSettings()
    await user.tab()
    expect(screen.getByRole('button', { name: 'General' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Types & fields' }))
    expect(await screen.findByRole('list', { name: 'Types' })).toBeInTheDocument()
  })
})

describe('W-13 settings: history limit validation', () => {
  it.each(['-1', '201', '1.5', 'abc'])('rejects %j without a request', async (text) => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Description history limit', text)
    await user.click(closeSettings())
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
    await user.click(closeSettings())
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(patches[0]!.body).toEqual({ markdown_history_limit: expected })
  })

  it('rejects an empty workspace name without a request', async () => {
    const { patches } = mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', '   ')
    await user.click(closeSettings())
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(field('Workspace name')).toHaveFocus()
    expect(patches).toEqual([])
  })

  it('clears a field error when the field is edited', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Description history limit', 'abc')
    await user.click(closeSettings())
    await screen.findByText(/whole number/)
    await user.type(field('Description history limit'), '{Backspace}{Backspace}{Backspace}5')
    expect(screen.queryByText(/whole number/)).not.toBeInTheDocument()
  })
})

describe('W-13 settings: server errors', () => {
  it.each([
    ['workspace_name', 'Workspace name'],
    ['streaming_country_code', 'Country'],
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
    await user.click(closeSettings())
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
    await user.click(closeSettings())
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
    await user.click(closeSettings())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not be reached/)
    expect(field('Workspace name')).toHaveValue('Casa')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
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
    await user.click(closeSettings())
    const banner = await screen.findByRole('alert')
    return { user, banner, backend }
  }

  it('keeps the draft and shows the conflict recovery banner', async () => {
    const { banner } = await conflict()
    expect(banner).toHaveTextContent(/Someone else changed the settings/)
    expect(field('Workspace name')).toHaveValue('My name')
    expect(field('Description history limit')).toHaveValue('200')
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

    // The next save uses the reloaded version.
    await retype(user, 'Workspace name', 'Mine again')
    await user.click(closeSettings())
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
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
    expect(await screen.findByLabelText(/Workspace name/)).toBeInTheDocument()
  })
})

describe('W-13 settings: pane', () => {
  it('opens as a dialog over the page it came from; Escape and Close go back to it', async () => {
    mountBackend()
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/trash')
    await screen.findByRole('heading', { level: 1, name: 'Trash' })
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await screen.findByRole('dialog', { name: 'Settings' })
    // The page behind the modal pane is still mounted, only hidden from the accessibility tree.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Trash', hidden: true }),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1, name: 'Trash' })).toBeInTheDocument()
  })

  it('a deep link has nothing behind it, and closing goes Home', async () => {
    mountBackend()
    const user = await openSettings()
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
  })
})

describe('W-13 settings: close saves changes', () => {
  it('keeps the pane open when the draft is invalid', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', '   ')
    await user.click(closeSettings())
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(field('Workspace name')).toHaveValue('   ')
  })

  it('keeps the pane open after a network failure and closes after Retry succeeds', async () => {
    mountBackend()
    let fail = true
    server.use(http.patch(settingsUrl, () => (fail ? HttpResponse.error() : undefined)))
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Dirty')
    await user.click(closeSettings())
    const alert = await screen.findByRole('alert')
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
  })

  it('does not ask when nothing changed', async () => {
    mountBackend()
    const user = await openSettings()
    await user.click(closeSettings())
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('saves successfully before closing', async () => {
    mountBackend()
    const user = await openSettings()
    await retype(user, 'Workspace name', 'Saved')
    await user.click(closeSettings())
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
  })
})
