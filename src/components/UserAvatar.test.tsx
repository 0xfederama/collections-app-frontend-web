import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserAvatar } from './UserAvatar'

describe('F-027 W1 UserAvatar', () => {
  it('renders an https image without referrer and with empty alt', () => {
    const { container } = render(<UserAvatar name="Ana" avatarUrl="https://x.test/a.png" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://x.test/a.png')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('alt', '')
  })

  it.each([null, undefined, '', 'http://x.test/a.png', 'javascript:alert(1)', 'not a url'])(
    'falls back to the letter for %s',
    (url) => {
      const { container } = render(<UserAvatar name="ana" avatarUrl={url} />)
      expect(container.querySelector('img')).toBeNull()
      expect(screen.getByTestId('user-avatar-fallback')).toHaveTextContent('A')
    },
  )

  it('uses the e-mail letter without a name, and ? with neither', () => {
    const { rerender } = render(<UserAvatar email="zed@x.test" />)
    expect(screen.getByTestId('user-avatar-fallback')).toHaveTextContent('Z')
    rerender(<UserAvatar />)
    expect(screen.getByTestId('user-avatar-fallback')).toHaveTextContent('?')
  })

  it('falls back to the letter when the image fails to load', () => {
    const { container } = render(<UserAvatar name="Bo" avatarUrl="https://x.test/a.png" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByTestId('user-avatar-fallback')).toHaveTextContent('B')
  })
})
