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

  it('renders main and Home (no menu button, no top bar) on mobile', async () => {
    mockViewport(375)
    renderAt('/')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
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

  it('renders "Page not found" inside the mobile shell (main, no Back to Home)', async () => {
    mockViewport(375)
    renderAt('/does/not/exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Back to Home' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})

describe('Dev UI route', () => {
  it('renders the UI gallery at /dev/ui in dev builds', async () => {
    expect(import.meta.env.DEV).toBe(true)
    renderAt('/dev/ui')
    expect(await screen.findByRole('heading', { name: 'UI gallery' })).toBeInTheDocument()
  })
})
