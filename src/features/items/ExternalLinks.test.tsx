import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../generated/examples'
import type { Item } from './api'
import { ExternalLinks } from './ExternalLinks'

const matrix = exampleResponses.getItem.body as Item
const withSite = (url: string | null): Item => ({ ...matrix, official_website_url: url })

const group = () => screen.getByRole('group', { name: 'External links' })
const controls = () => [...group().querySelectorAll<HTMLElement>('a, button')]

describe('AT-13 external links component', () => {
  it('renders a group with exactly three controls in order', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    const items = controls()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(/^Google/)
    expect(items[1]).toHaveTextContent(/^Reddit/)
    expect(items[2]).toHaveTextContent(/^Official site/)
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

  it('shows an anchor to the official site when set', () => {
    render(<ExternalLinks item={withSite('https://www.thematrix.com/')} />)
    const official = controls()[2]
    expect(official?.tagName).toBe('A')
    expect(official).toHaveAttribute('href', 'https://www.thematrix.com/')
  })

  it('with no official site, the third control is an aria-disabled button without href', () => {
    render(<ExternalLinks item={withSite(null)} />)
    expect(within(group()).getAllByRole('link')).toHaveLength(2)
    const disabled = within(group()).getByRole('button', { name: 'No official site' })
    expect(disabled).toHaveAttribute('aria-disabled', 'true')
    expect(disabled).not.toHaveAttribute('href')
    expect(controls()[2]).toBe(disabled)
  })

  it('treats an unsafe official site as missing', () => {
    render(<ExternalLinks item={withSite('javascript:alert(1)')} />)
    expect(screen.getByRole('button', { name: 'No official site' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })
})
