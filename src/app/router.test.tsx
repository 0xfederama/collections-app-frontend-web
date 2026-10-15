import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockViewport, renderAt } from '../test-utils'

describe('AppShell', () => {
  it('renders Library navigation and main landmarks on desktop, with no top bar', async () => {
    renderAt('/')
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('renders main and the menu button, with no top bar, on mobile', async () => {
    mockViewport(375)
    renderAt('/')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})

describe('Home route', () => {
  it('renders the Home heading at "/"', async () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })
})

describe('Unknown route', () => {
  it('renders "Page not found" with a link home, inside the shell', async () => {
    renderAt('/does/not/exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeInTheDocument()
  })

  it('renders "Page not found" inside the mobile shell (menu button and main)', async () => {
    mockViewport(375)
    renderAt('/does/not/exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })
})

describe('Dev UI route', () => {
  it('renders the UI gallery at /dev/ui in dev builds', async () => {
    expect(import.meta.env.DEV).toBe(true)
    renderAt('/dev/ui')
    expect(await screen.findByRole('heading', { name: 'UI gallery' })).toBeInTheDocument()
  })
})
