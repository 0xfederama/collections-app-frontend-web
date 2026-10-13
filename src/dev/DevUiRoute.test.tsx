import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '../lib/theme'
import { DevUiRoute } from './DevUiRoute'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

function setup() {
  return render(
    <MemoryRouter>
      <DevUiRoute />
    </MemoryRouter>,
  )
}

describe('DevUiRoute', () => {
  it('renders the UI gallery heading and a theme radiogroup', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'UI gallery' })).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Theme' })
    expect(group).toBeInTheDocument()
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(within(group).getByRole('radio', { name: 'System' })).toBeChecked()
  })

  it('has section anchors that point at existing sections', () => {
    setup()
    const nav = screen.getByRole('navigation', { name: 'Gallery sections' })
    const links = Array.from(nav.querySelectorAll('a'))
    expect(links.length).toBeGreaterThanOrEqual(7)
    for (const a of links) {
      const id = a.getAttribute('href')!.slice(1)
      expect(document.getElementById(id), `section #${id}`).not.toBeNull()
    }
  })

  it('clicking Dark sets data-theme="dark" and persists it', async () => {
    setup()
    const group = screen.getByRole('radiogroup', { name: 'Theme' })
    await userEvent.click(within(group).getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(within(group).getByRole('radio', { name: 'Dark' })).toBeChecked()
  })
})
