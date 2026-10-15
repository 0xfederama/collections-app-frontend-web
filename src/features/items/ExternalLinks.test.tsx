import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import type { Item } from './api'
import { ExternalLinks } from './ExternalLinks'

const matrix = exampleResponses.getItem.body as Item
const withSite = (url: string | null): Item => ({
  ...matrix,
  kind: 'generic',
  metadata: {},
  website: url,
})

const group = () => screen.getByRole('group', { name: 'External links' })
const controls = () => [...group().querySelectorAll<HTMLElement>('a, button')]

describe('AT-13 external links component', () => {
  it('a movie shows Google, Letterboxd, IMDb; the stored IMDb link is used', () => {
    render(<ExternalLinks item={matrix} />)
    const items = controls()
    expect(items.map((c) => c.getAttribute('href')?.split('/')[2])).toEqual([
      'www.google.com',
      'letterboxd.com',
      'www.imdb.com',
    ])
    expect(items[2]).toHaveAttribute('href', expect.stringContaining('imdb.com'))
  })

  it('a TV show shows Google and IMDb only', () => {
    render(<ExternalLinks item={{ ...matrix, kind: 'tv_show', metadata: {} }} />)
    expect(controls().map((c) => c.getAttribute('href')?.split('/')[2])).toEqual([
      'www.google.com',
      'www.imdb.com',
    ])
  })

  it('renders a group with the three controls in order', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    const items = controls()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveAccessibleName(/^Google/)
    expect(items[1]).toHaveAccessibleName(/^Reddit/)
    expect(items[2]).toHaveAccessibleName(/^Website/)
  })

  it('opens links in a new tab with noopener noreferrer', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    for (const link of within(group()).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('Google and Reddit hrefs are searches for the item', () => {
    render(<ExternalLinks item={withSite(null)} />)
    const [google, reddit] = controls()
    const g = new URL(google?.getAttribute('href') ?? '')
    const r = new URL(reddit?.getAttribute('href') ?? '')
    expect(g.searchParams.get('q')).toBe('The Matrix')
    expect(r.searchParams.get('q')).toBe('The Matrix site:reddit.com')
  })

  it('shows an anchor to the website when set', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    const website = controls()[2]
    expect(website?.tagName).toBe('A')
    expect(website).toHaveAttribute('href', 'https://www.thematrix.com/')
  })

  it('with no website, "Add website" asks the page to open the editor', async () => {
    const onAddWebsite = vi.fn()
    render(<ExternalLinks item={withSite(null)} onAddWebsite={onAddWebsite} />)
    expect(controls()).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Add website' }))
    expect(onAddWebsite).toHaveBeenCalledTimes(1)
  })

  it('an unsafe website shows only Google and Reddit, never a link or an Add button', () => {
    const onAddWebsite = vi.fn()
    render(<ExternalLinks item={withSite('javascript:alert(1)')} onAddWebsite={onAddWebsite} />)
    expect(controls()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Add website' })).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it('without a website and without the callback, only Google and Reddit show', () => {
    const { unmount } = render(<ExternalLinks item={withSite(null)} />)
    expect(controls()).toHaveLength(2)
    unmount()
    render(<ExternalLinks item={withSite('javascript:alert(1)')} />)
    expect(controls()).toHaveLength(2)
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })
})
