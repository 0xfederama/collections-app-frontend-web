import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownView } from './MarkdownView'
import { sanitizeUrl } from './sanitizeUrl'

describe('AT-08 sanitizeUrl', () => {
  it.each([
    'http://example.org/a',
    'https://example.org/a?b=c#d',
    'mailto:me@example.org',
    'HTTPS://EXAMPLE.ORG',
    '/a',
    'a/b',
    '#x',
    '?q=1',
    '//host/x',
    'a/b:c',
    '',
  ])('allows %j', (url) => {
    expect(sanitizeUrl(url)).toBe(url)
  })

  it.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['data:text/html,x'],
    ['vbscript:x'],
    ['java\nscript:alert(1)'],
    [' javascript:x'],
    ['file:///etc/passwd'],
    ['ftp://x'],
  ])('blocks %j', (url) => {
    expect(sanitizeUrl(url)).toBe('')
  })
})

describe('AT-08 MarkdownView safety', () => {
  it('renders a javascript: link as plain text without an href', () => {
    const { container } = render(<MarkdownView source="[x](javascript:alert(1))" />)
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('[href]')).toBeNull()
  })

  it.each([
    ['javascript:', '![x](javascript:alert(1))'],
    ['data:', '![x](data:image/svg+xml,%3Csvg%20onload=alert(1)%3E)'],
  ])('renders no image for a %s src', (_, source) => {
    const { container } = render(<MarkdownView source={source} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[src]')).toBeNull()
  })

  it('drops raw HTML', () => {
    const { container } = render(
      <MarkdownView source={'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\nok'} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('opens http links in a new tab with noopener noreferrer', () => {
    render(<MarkdownView source="[site](https://example.org/a)" />)
    const link = screen.getByRole('link', { name: 'site' })
    expect(link).toHaveAttribute('href', 'https://example.org/a')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('keeps relative and mailto links', () => {
    render(<MarkdownView source="[a](/a) [m](mailto:me@example.org)" />)
    expect(screen.getByRole('link', { name: 'a' })).toHaveAttribute('href', '/a')
    expect(screen.getByRole('link', { name: 'm' })).toHaveAttribute('href', 'mailto:me@example.org')
  })

  it('images load lazily and send no referrer', () => {
    render(<MarkdownView source="![pic](https://example.org/p.png)" />)
    const img = screen.getByRole('img', { name: 'pic' })
    expect(img).toHaveAttribute('src', 'https://example.org/p.png')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('loading', 'lazy')
  })
})

describe('MarkdownView rendering', () => {
  it('starts headings at h3', () => {
    render(<MarkdownView source={'# One\n\n## Two\n\n### Three'} />)
    expect(screen.getByRole('heading', { name: 'One', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Three', level: 4 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('renders GFM tables', () => {
    render(<MarkdownView source={'| a | b |\n| - | - |\n| 1 | 2 |'} />)
    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['a', 'b'])
    expect(
      within(table)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['1', '2'])
  })

  it('renders strikethrough', () => {
    const { container } = render(<MarkdownView source="~~gone~~" />)
    expect(container.querySelector('del')).toHaveTextContent('gone')
  })

  it('renders task lists as checkboxes', () => {
    render(<MarkdownView source={'- [x] done\n- [ ] todo'} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]).toBeChecked()
    expect(boxes[1]).not.toBeChecked()
  })
})
