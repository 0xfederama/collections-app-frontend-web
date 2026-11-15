import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { apiUrl, ID, openTree } from './treeTestKit'

const main = () => screen.getByRole('main')

async function openMenu(path: string) {
  const view = await openTree(path)
  await within(main()).findByRole('heading', { level: 1 })
  const rows = await within(main()).findByRole('list', { name: 'Items' })
  const titles = within(rows)
    .getAllByRole('link')
    .map((link) => link.textContent)
  await view.user.click(await within(main()).findByRole('button', { name: /^More actions for/ }))
  await screen.findByRole('menuitem', { name: 'Rename' })
  return { ...view, titles }
}

describe('roadmap 36 movie extras in the list menu', () => {
  it('a Movies list offers the map link (new tab) and the random pick', async () => {
    await openMenu(`/lists/${ID.watchlist}`)
    const link = screen.getByRole('menuitem', { name: /Movie Vector Map/ })
    expect(link).toHaveAttribute('href', 'https://mikeyguinness.com/movies/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('menuitem', { name: 'Pick a random movie' })).toBeEnabled()
  })

  it('other types get neither entry', async () => {
    await openMenu(`/lists/${ID.motorbikes}`)
    expect(screen.queryByRole('menuitem', { name: /Pick a random/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Movie Vector Map/ })).not.toBeInTheDocument()
  })

  it('picks a shown movie, announces it, highlights the row and offers another', async () => {
    const { user, titles } = await openMenu(`/lists/${ID.watchlist}`)
    await user.click(screen.getByRole('menuitem', { name: 'Pick a random movie' }))
    const status = await screen.findByText(/^Random pick: /, { selector: '[role="status"]' })
    const first = status.textContent?.replace('Random pick: ', '')
    expect(titles).toContain(first)
    await waitFor(() =>
      expect(document.querySelector('li[data-picked]')).toHaveTextContent(first ?? ''),
    )
    if (titles.length > 1) {
      await user.click(screen.getByRole('button', { name: 'Pick another' }))
      await waitFor(() => expect(status.textContent).not.toBe(`Random pick: ${first}`))
    }
    await user.click(screen.getByRole('button', { name: 'Dismiss random pick' }))
    expect(status).toHaveTextContent('')
  })

  it('is disabled with a reason when the search shows nothing', async () => {
    server.use(
      http.get(apiUrl(`/api/v1/lists/${ID.watchlist}/items`), () =>
        HttpResponse.json({ data: [], page: { limit: 50, offset: 0, total: 0 } }),
      ),
    )
    const view = await openTree(`/lists/${ID.watchlist}?q=zzzz-no-such-movie`)
    await within(main()).findByText('No items match')
    await view.user.click(within(main()).getByRole('button', { name: /^More actions for/ }))
    const pick = await screen.findByRole('menuitem', { name: /Pick a random movie/ })
    expect(pick).toHaveAttribute('aria-disabled', 'true')
    expect(pick).toHaveTextContent('No movies shown')
  })
})
