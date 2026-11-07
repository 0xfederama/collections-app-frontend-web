import { useState } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import { isSingleEmoji, ListIconPicker } from './ListIconPicker'
import { searchListIcons } from './iconModel'
import type { IconChoice } from './iconModel'

function Harness({
  onChange,
  initial = { icon: null, icon_color: null },
}: {
  onChange: (value: IconChoice) => void
  initial?: IconChoice
}) {
  const [value, setValue] = useState<IconChoice>(initial)
  return (
    <ListIconPicker
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
      onClose={vi.fn()}
    />
  )
}

describe('F012-W1 list icon picker', () => {
  it('searches built-in names and curated emoji keywords case-insensitively by partial word', () => {
    const result = searchListIcons('CAMER')
    expect(result.builtins.some((icon) => icon.key === 'camera')).toBe(true)
    expect(result.emoji.some(([emoji]) => emoji === '📷')).toBe(true)
    expect(searchListIcons('').builtins.length).toBeGreaterThan(50)
  })

  it('accepts one emoji grapheme and rejects plain text or multiple graphemes', () => {
    expect(isSingleEmoji('🪿')).toBe(true)
    expect(isSingleEmoji('👨‍👩‍👧‍👦')).toBe(true)
    expect(isSingleEmoji('🇮🇹')).toBe(true)
    expect(isSingleEmoji('pizza')).toBe(false)
    expect(isSingleEmoji('🍕🍕')).toBe(false)
  })

  it('lets keyboard users search, choose an icon and named color, enter a free emoji, and reset', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Harness onChange={onChange} />)

    const search = screen.getByRole('textbox', { name: 'Search icons and emoji' })
    await user.type(search, 'camer')
    await user.click(screen.getByRole('button', { name: 'camera' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: 'i:camera', icon_color: null })

    await user.click(screen.getByRole('button', { name: 'Indigo' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: 'i:camera', icon_color: 'indigo' })
    expect(screen.getByRole('group', { name: 'Icon color' })).toBeInTheDocument()

    await user.clear(search)
    await user.type(screen.getByRole('textbox', { name: 'Use an emoji' }), '🪿')
    await user.click(screen.getByRole('button', { name: 'Use emoji' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: '🪿', icon_color: null })
    expect(screen.queryByRole('group', { name: 'Icon color' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use default' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: null, icon_color: null })
  })

  it('uses token classes and touch-sized, visibly focusable icon and color controls', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} />)
    await user.type(screen.getByRole('textbox', { name: 'Search icons and emoji' }), 'camer')
    const camera = screen.getByRole('button', { name: 'camera' })
    expect(camera).toHaveClass('pointer-coarse:size-11', 'focus-visible:outline-focus-ring')
    expect(camera).not.toHaveAttribute('style')
    await user.click(camera)
    const indigo = screen.getByRole('button', { name: 'Indigo' })
    expect(indigo).toHaveClass(
      'bg-list-icon-indigo',
      'pointer-coarse:size-11',
      'focus-visible:outline-focus-ring',
    )
    expect(indigo).not.toHaveAttribute('style')
  })

  it('F012-W1 shows no emoji preview, and the grids stay collapsed until "Show all icons"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} />)

    expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Built-in icons' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'camera' })).not.toBeInTheDocument()
    expect(screen.getByText('Type to search icons and emoji, or show all icons.')).toBeVisible()

    const toggle = screen.getByRole('button', { name: 'Show all icons' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'camera' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '📷 camera' })).toBeInTheDocument()
  })

  it('F012-W1 search results show while collapsed, and the toggle is hidden while searching', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: 'Search icons and emoji' }), 'camer')
    expect(screen.getByRole('button', { name: 'camera' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show all icons' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'bike' })).not.toBeInTheDocument()
  })

  it('F012-W1 shows the color row beside the current icon, not below it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} />)

    await user.type(screen.getByRole('textbox', { name: 'Search icons and emoji' }), 'camer')
    await user.click(screen.getByRole('button', { name: 'camera' }))
    const group = screen.getByRole('group', { name: 'Icon color' })
    const row = group.parentElement
    expect(row).not.toBeNull()
    if (!row) throw new Error('The color group must sit in a row.')
    // The current icon name, the color group and "Use default" share one row.
    expect(within(row).getByText('camera')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Use default' })).toBeInTheDocument()
  })

  it('F012-W1 shows the current icon name for a built-in and "Emoji" for a free emoji', () => {
    const { unmount } = renderWithProviders(
      <Harness onChange={vi.fn()} initial={{ icon: 'i:camera', icon_color: 'teal' }} />,
    )
    expect(screen.getByText('camera')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Teal' })).toHaveAttribute('aria-pressed', 'true')
    unmount()

    renderWithProviders(<Harness onChange={vi.fn()} initial={{ icon: '🪿', icon_color: null }} />)
    expect(screen.getByText('Emoji')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Icon color' })).not.toBeInTheDocument()
  })
})
