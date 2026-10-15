import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import type { Item } from './api'
import { ExternalLinks } from './ExternalLinks'

const matrix = exampleResponses.getItem.body as Item
const withSite = (url: string | null): Item => ({ ...matrix, website: url })

const group = () => screen.getByRole('group', { name: 'External links' })
const controls = () => [...group().querySelectorAll<HTMLElement>('a, button')]

describe('AT-13 external links component', () => {
  it('renders a group with the three controls in order', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    const items = controls()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(/^Google/)
    expect(items[1]).toHaveTextContent(/^Reddit/)
    expect(items[2]).toHaveTextContent(/^Website/)
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
    expect(g.searchParams.get('q')).toBe('The Matrix 1999 film')
    expect(r.searchParams.get('q')).toBe('The Matrix 1999 film site:reddit.com')
  })

  it('shows an anchor to the website when set', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    const website = controls()[2]
    expect(website?.tagName).toBe('A')
    expect(website).toHaveAttribute('href', 'https://www.thematrix.com/')
  })

  it('with no website, or an unsafe one, only Google and Reddit show (no "No website" button)', () => {
    const { unmount } = render(<ExternalLinks item={withSite(null)} />)
    expect(controls()).toHaveLength(2)
    expect(screen.queryByText('No website')).not.toBeInTheDocument()
    unmount()
    render(<ExternalLinks item={withSite('javascript:alert(1)')} />)
    expect(controls()).toHaveLength(2)
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })
})
