import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'
import type { Item } from './api'
import { createContentBackend } from './content/contentTestBackend'

const WATCHLIST = '7c1e5a10-0000-4000-8000-000000000011'
const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const PATH = `/lists/${WATCHLIST}/items/${ITEM}`
const itemUrl = `${location.origin}/api/v1/items/${ITEM}`
const contentUrl = `${itemUrl}/content`
const settingsUrl = `${location.origin}/api/v1/settings`

const matrix = exampleResponses.getItem.body as Item

function overrideItem(over: Partial<Item>) {
  server.use(http.get(itemUrl, () => HttpResponse.json({ ...matrix, ...over })))
}

async function renderItem(path = PATH) {
  mockViewport(1100)
  renderAt(path)
  return screen.findByRole('heading', { name: 'The Matrix', level: 1 })
}

/** Renders an overridden item and waits for its title. */
async function renderOverride(over: Partial<Item>) {
  overrideItem(over)
  mockViewport(1100)
  renderAt(PATH)
  return screen.findByRole('heading', { level: 1, name: over.title ?? 'The Matrix' })
}

const links = () => within(screen.getByRole('group', { name: 'External links' }))

describe('AT-13 item view: the example movie', () => {
  it('shows the title and Google, Letterboxd, IMDb for a movie, with a kind label but no status or summary (F007-W7, W8)', async () => {
    await renderItem()
    // F-002: a quiet kind label above the title.
    expect(screen.getByText('Movie')).toBeInTheDocument()
    expect(screen.queryByText('Watched')).not.toBeInTheDocument()

    const google = links().getByRole('link', { name: /^Google/ })
    expect(new URL(google.getAttribute('href') ?? '').searchParams.get('q')).toBe(
      'The Matrix 1999 film',
    )
    expect(google.getAttribute('href')).toContain('1999+film')
    expect(links().getByRole('link', { name: /^Letterboxd/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://letterboxd.com/search/The%20Matrix'),
    )
    // The stored IMDb link feeds the button.
    expect(links().getByRole('link', { name: /^IMDb/ })).toHaveAttribute(
      'href',
      'https://www.imdb.com/title/tt0133093/',
    )
    expect(links().queryByRole('link', { name: /^Reddit/ })).not.toBeInTheDocument()
    expect(links().queryByRole('link', { name: /^Website/ })).not.toBeInTheDocument()
    expect(links().queryByRole('button', { name: 'Add website' })).not.toBeInTheDocument()
  })

  it('shows the kind section with units and streaming icons, and no IMDb row (F-002)', async () => {
    await renderItem()
    const details = (await screen.findByRole('heading', { name: 'Details' })).closest('section')!
    expect(within(details).getByText('136 min')).toBeInTheDocument()
    expect(within(details).getByText('1999')).toBeInTheDocument()
    expect(within(details).queryByText('IMDb')).not.toBeInTheDocument()
    expect(within(details).queryByRole('link', { name: /IMDb/ })).not.toBeInTheDocument()
    // Streaming is its own section; its heading carries the country (F-002 finish review).
    const streaming = screen.getByRole('heading', { name: 'Streaming · Italy' }).closest('section')!
    expect(within(details).queryByRole('list', { name: 'Platforms' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Streaming in /)).not.toBeInTheDocument()
    const platforms = within(streaming).getByRole('list', { name: 'Platforms' })
    expect(within(platforms).getByRole('img', { name: 'Netflix' })).toBeInTheDocument()
    expect(within(platforms).getByRole('img', { name: 'Prime Video, paid' })).toBeInTheDocument()
    expect(within(streaming).queryByRole('note')).not.toBeInTheDocument()
  })

  it('warns when the streaming country differs from the settings country', async () => {
    overrideItem({
      metadata: { ...matrix.metadata, streaming: { country: 'US', platforms: ['Hulu'] } },
    })
    await renderItem()
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent(/Italy/)
    expect(note).toHaveTextContent(/United States/)
    expect(screen.getByRole('heading', { name: 'Streaming · United States' })).toBeInTheDocument()
  })

  it('shows no warning while the settings are unknown', async () => {
    server.use(http.get(settingsUrl, () => problemResponse(500, 'internal_error')))
    await renderItem()
    await screen.findByRole('heading', { name: 'Streaming · Italy' })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('renders the description as Markdown', async () => {
    await renderItem()
    expect(await screen.findByRole('heading', { name: 'Notes', level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/Great film/)).toBeInTheDocument()
  })

  it('F-002 has no Edit button or edit mode: pens appear per field and the footer keeps Move and Delete', async () => {
    await renderItem()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit title' })).toBeInTheDocument()
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(within(footer).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(within(footer).getByText(/^Updated/)).toBeInTheDocument()
  })

  it('F-002 the "…" menu has Move and Delete too', async () => {
    await renderItem()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Item actions' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Move' })).toBeInTheDocument()
    await user.click(within(menu).getByRole('menuitem', { name: 'Delete' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Delete “The Matrix”?')
  })

  it('has a Back link to the list on a full page', async () => {
    await renderItem()
    expect(screen.getByRole('link', { name: /Back to Watchlist/ })).toHaveAttribute(
      'href',
      `/lists/${WATCHLIST}`,
    )
  })
})

describe('item view: kinds', () => {
  it('tv show: ongoing run reads 2019–present', async () => {
    await renderOverride({
      title: 'Severance',
      kind: 'tv_show',
      metadata: { first_air_year: 2019, seasons: 2 },
    })
    expect(await screen.findByText('2019–present')).toBeInTheDocument()
    expect(screen.getByText('Years')).toBeInTheDocument()
    expect(screen.getByText('Seasons').nextElementSibling).toHaveTextContent('2')
    expect(screen.queryByText('First aired')).not.toBeInTheDocument()
    const google = links().getByRole('link', { name: /^Google/ })
    expect(new URL(google.getAttribute('href') ?? '').searchParams.get('q')).toBe(
      'Severance TV series',
    )
  })

  it('tv show: finished run reads 2019–2023', async () => {
    await renderOverride({
      title: 'Severance',
      kind: 'tv_show',
      metadata: { first_air_year: 2019, end_year: 2023 },
    })
    expect(await screen.findByText('2019–2023')).toBeInTheDocument()
  })

  it('F008-W14 a generic item offers only Website, never Price', async () => {
    const user = userEvent.setup()
    await renderOverride({ title: 'Notebook', kind: 'generic', metadata: {}, price: null })
    await screen.findByRole('heading', { name: 'Description' })
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    expect(await screen.findByRole('menuitem', { name: 'Website' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Price' })).not.toBeInTheDocument()
  })

  it('generic item with nothing set shows no rows, only "Add field"', async () => {
    await renderOverride({ title: 'Notebook', kind: 'generic', metadata: {} })
    await screen.findByRole('heading', { name: 'Description' })
    expect(screen.queryByRole('term')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add field' })).toBeInTheDocument()
  })

  it('motorcycle shows its units', async () => {
    await renderOverride({
      title: 'Ducati Monster',
      kind: 'motorcycle',
      metadata: { displacement_cc: 937, power_hp: 111, license_class: 'A' },
    })
    expect(await screen.findByText('937 cc')).toBeInTheDocument()
    expect(screen.getByText('111 hp')).toBeInTheDocument()
  })

  it('car shows units and enum labels', async () => {
    await renderOverride({
      title: 'Golf',
      kind: 'car',
      metadata: { power_hp: 111, fuel_type: 'plugin_hybrid', model_year: 2021 },
    })
    expect(await screen.findByText('111 hp')).toBeInTheDocument()
    expect(screen.getByText('Plug-in hybrid')).toBeInTheDocument()
    expect(screen.getByText('2021')).toBeInTheDocument()
  })

  it('camera shows megapixels', async () => {
    await renderOverride({
      title: 'Alpha',
      kind: 'camera',
      metadata: { megapixels: 24.2, sensor_format: 'full_frame' },
    })
    expect(await screen.findByText('24.2 MP')).toBeInTheDocument()
    expect(screen.getByText('Full frame')).toBeInTheDocument()
  })

  it('a generic item shows Google, Reddit and Website; an empty website offers "Add website", which opens the editor', async () => {
    await renderOverride({ kind: 'generic', metadata: {}, website: null })
    expect(links().getByRole('link', { name: /^Reddit/ })).toBeInTheDocument()
    await userEvent.click(links().getByRole('button', { name: 'Add website' }))
    expect(await screen.findByRole('textbox', { name: /Website/ })).toBeInTheDocument()
  })

  it('a good website is a link', async () => {
    await renderOverride({ kind: 'generic', metadata: {}, website: 'https://www.thematrix.com/' })
    expect(links().getByRole('link', { name: /^Website/ })).toHaveAttribute(
      'href',
      'https://www.thematrix.com/',
    )
  })

  it('F007-W8 a single price reads € 1,200, a range € 1,000–1,400, no price shows nothing', async () => {
    await renderOverride({ price: { min: '1200.00', max: '1200.00', currency: 'EUR' } })
    expect(await screen.findByText(/^€\s?1,200$/)).toBeInTheDocument()
  })

  it('F007-W8 a range shows both bounds, each with the currency', async () => {
    await renderOverride({ price: { min: '1000.00', max: '1400.00', currency: 'EUR' } })
    expect(await screen.findByText(/^€\s1,000–1,400$/)).toBeInTheDocument()
  })

  it('F007-W8 an item without a price shows no price', async () => {
    await renderOverride({ price: null })
    await screen.findByRole('heading', { name: 'Description' })
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })
})

describe('item view: description states', () => {
  it('shows the "Click to start writing" placeholder for an empty body', async () => {
    server.use(
      http.get(contentUrl, () =>
        HttpResponse.json({ item_id: ITEM, version: 0, body: '', updated_at: matrix.created_at }),
      ),
    )
    await renderItem()
    expect(await screen.findByText('Click to start writing')).toBeInTheDocument()
  })

  it('shows its own Retry when the description fails, without hiding the item', async () => {
    let calls = 0
    server.use(
      http.get(contentUrl, () => {
        calls++
        return calls === 1
          ? problemResponse(500, 'internal_error')
          : HttpResponse.json({ item_id: ITEM, version: 2, body: 'Back again', updated_at: '' })
      }),
    )
    const user = userEvent.setup()
    await renderItem()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The description could not be loaded.')
    expect(screen.getByRole('heading', { name: 'The Matrix', level: 1 })).toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Back again')).toBeInTheDocument()
    expect(calls).toBe(2)
  })
})

describe('item view: loading and errors', () => {
  it('shows a skeleton while the item is pending', async () => {
    server.use(
      http.get(itemUrl, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json(matrix)
      }),
    )
    mockViewport(1100)
    renderAt(PATH)
    expect(await screen.findByText('Loading item')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'The Matrix', level: 1 })).toBeInTheDocument()
    expect(screen.queryByText('Loading item')).not.toBeInTheDocument()
  })

  it('404 shows "Item not found" with a Back link that keeps the search', async () => {
    server.use(http.get(itemUrl, () => problemResponse(404, 'not_found')))
    mockViewport(1100)
    renderAt(`${PATH}?q=x`)
    expect(await screen.findByRole('heading', { name: 'Item not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Watchlist' })).toHaveAttribute(
      'href',
      `/lists/${WATCHLIST}?q=x`,
    )
  })

  it('500 shows an alert and Retry refetches', async () => {
    let calls = 0
    server.use(
      http.get(itemUrl, () => {
        calls++
        return calls === 1 ? problemResponse(500, 'internal_error') : HttpResponse.json(matrix)
      }),
    )
    const user = userEvent.setup()
    mockViewport(1100)
    renderAt(PATH)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Couldn’t load this item.')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'The Matrix', level: 1 })).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('an item that lives in another list redirects to its own URL', async () => {
    const OTHER = '7c1e5a10-0000-4000-8000-000000000012'
    overrideItem({ list_id: OTHER })
    mockViewport(1100)
    renderAt(PATH)
    expect(await screen.findByRole('link', { name: /Back to Motorbikes/ })).toBeInTheDocument()
  })
})

describe('item view: hero image', () => {
  const image = { source: 'url', url: 'https://example.org/matrix.jpg' } as Item['image']

  it('opens the full-size image in a dialog', async () => {
    overrideItem({ image })
    const user = userEvent.setup()
    await renderItem()
    await user.click(
      await screen.findByRole('button', { name: 'View image of The Matrix full size' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: 'The Matrix' })).toHaveAttribute(
      'src',
      'https://example.org/matrix.jpg',
    )
  })

  it('falls back to the tile when the image fails to load', async () => {
    overrideItem({ image })
    await renderItem()
    expect(screen.queryByTestId('fallback-tile')).not.toBeInTheDocument()
    fireEvent.error(await screen.findByRole('img', { name: 'The Matrix' }))
    await waitFor(() => expect(screen.getByTestId('fallback-tile')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /View image/ })).not.toBeInTheDocument()
  })

  it('F-002 an item without an image has only a slim "Add image" row, no tile', async () => {
    await renderItem()
    expect(screen.getByRole('button', { name: 'Add image' })).toBeInTheDocument()
    expect(screen.queryByTestId('fallback-tile')).not.toBeInTheDocument()
  })

  it('F-002 "Change image" sits over the picture and opens the image dialog', async () => {
    overrideItem({ image })
    const user = userEvent.setup()
    await renderItem()
    await user.click(await screen.findByRole('button', { name: 'Change image' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change image' })
    expect(within(dialog).getByRole('button', { name: 'Remove image' })).toBeInTheDocument()
  })
})

describe('AT-08 web: item view description history', () => {
  it('has no History button while the description is loading or failed', async () => {
    server.use(http.get(contentUrl, () => problemResponse(500, 'internal_error')))
    await renderItem()
    await screen.findByText('The description could not be loaded.')
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument()
  })

  it('History lists the versions newest first with sizes', async () => {
    createContentBackend().use()
    const user = userEvent.setup()
    await renderItem()
    await user.click(await screen.findByRole('button', { name: 'History' }))
    const drawer = await screen.findByRole('dialog', { name: 'History' })
    const rows = await within(drawer).findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Version 2 (current)')
    expect(rows[0]).toHaveTextContent('35 B')
    expect(rows[1]).toHaveTextContent('Version 1')
    expect(rows[1]).toHaveTextContent('3 B')
  })

  it('previews an old version, restores it with the current If-Match, and the view shows it', async () => {
    const backend = createContentBackend()
    backend.use()
    const user = userEvent.setup()
    await renderItem()
    await screen.findByText('Great film, rewatch in 4K.')
    await user.click(screen.getByRole('button', { name: 'History' }))
    const drawer = await screen.findByRole('dialog', { name: 'History' })
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    const preview = await within(drawer).findByRole('region', { name: 'Preview of version 1' })
    expect(await within(preview).findByText('Old')).toBeVisible()

    await user.click(within(preview).getByRole('button', { name: 'Restore this version' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(backend.restores).toHaveLength(0)
    await user.click(within(confirm).getByRole('button', { name: 'Restore this version' }))

    expect(await screen.findByText('Restored version 1')).toBeInTheDocument()
    expect(backend.restores).toEqual([{ ifMatch: '"c-2"', body: { version: 1 } }])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'History' })).toBeNull())
    expect(await screen.findByText('Old')).toBeInTheDocument()
    expect(screen.queryByText('Great film, rewatch in 4K.')).not.toBeInTheDocument()
  })

  it('a 412 on restore shows a message and the view refreshes to the newer text', async () => {
    const backend = createContentBackend()
    backend.use()
    const user = userEvent.setup()
    await renderItem()
    await screen.findByText('Great film, rewatch in 4K.')
    await user.click(screen.getByRole('button', { name: 'History' }))
    const drawer = await screen.findByRole('dialog', { name: 'History' })
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    backend.externalSave('Changed elsewhere')
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
    expect(await screen.findByText('Changed elsewhere')).toBeInTheDocument()
  })

  it('a pruned version shows the pruned message', async () => {
    const backend = createContentBackend()
    backend.pruned.add(1)
    backend.use()
    const user = userEvent.setup()
    await renderItem()
    await user.click(await screen.findByRole('button', { name: 'History' }))
    const drawer = await screen.findByRole('dialog', { name: 'History' })
    await user.click(await within(drawer).findByRole('button', { name: /^Version 1/ }))
    expect(
      await within(drawer).findByText(
        'This version is no longer available (older versions are pruned).',
      ),
    ).toBeVisible()
    expect(within(drawer).getByRole('button', { name: 'Refresh the list' })).toBeVisible()
  })
})
