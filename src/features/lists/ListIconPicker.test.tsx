import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { isSingleEmoji, ListIconPicker } from './ListIconPicker'
import { searchListIcons } from './iconModel'
import type { IconChoice } from './iconModel'

function Harness({ onChange }: { onChange: (value: IconChoice) => void }) {
  const [value, setValue] = useState<IconChoice>({ icon: null, icon_color: null })
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
    render(<Harness onChange={onChange} />)

    const search = screen.getByRole('textbox', { name: 'Search icons and emoji' })
    await user.type(search, 'camer')
    await user.click(screen.getByRole('button', { name: 'camera', exact: true }))
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
})
