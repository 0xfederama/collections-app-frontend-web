import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteIcon } from './SiteIcon'

describe('roadmap 28 SiteIcon', () => {
  it('shows the globe when there is no URL', () => {
    const { container } = render(<SiteIcon src={null} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('shows the favicon when it has a URL, decorative and without a referrer', () => {
    const { container } = render(<SiteIcon src="https://icons.example/favicon.png" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://icons.example/favicon.png')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('falls back to the globe when the favicon fails to load', () => {
    const { container } = render(<SiteIcon src="https://icons.example/broken.png" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('a new URL after a failed one gets its own try', () => {
    const { container, rerender } = render(<SiteIcon src="https://icons.example/broken.png" />)
    fireEvent.error(container.querySelector('img')!)
    rerender(<SiteIcon src="https://icons.example/ok.png" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://icons.example/ok.png')
  })

  it('tile mode draws the frame of a row tile', () => {
    const { container } = render(<SiteIcon src={null} size={24} tile />)
    const box = container.firstElementChild as HTMLElement
    expect(box).toHaveClass('rounded-sm', 'border', 'border-border', 'bg-fill', 'p-[18%]')
    expect(box.style.width).toBe('24px')
    expect(box.style.height).toBe('24px')
  })

  it('bare mode has no frame', () => {
    const { container } = render(<SiteIcon src={null} />)
    const box = container.firstElementChild as HTMLElement
    expect(box).not.toHaveClass('border')
    expect(box.style.width).toBe('16px')
  })
})
