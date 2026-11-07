import { useState } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import { searchListIcons, type IconChoice } from './iconModel'
import { ListIconPopover } from './ListIconPopover'

function Harness({
  onChange,
  initial = { icon: null, icon_color: null },
  fail = false,
}: {
  onChange: (value: IconChoice) => void
  initial?: IconChoice
  fail?: boolean
}) {
  const [value, setValue] = useState<IconChoice>(initial)
  const [open, setOpen] = useState(true)
  return (
    <ListIconPopover
      value={value}
      open={open}
      onOpenChange={setOpen}
      onChange={(next) => {
        onChange(next)
        if (fail) return false
        setValue(next)
        return true
      }}
    >
      <button type="button">Change icon</button>
    </ListIconPopover>
  )
}

const search = () => screen.getByRole('textbox', { name: 'Search icons and emoji' })

describe('F012-W1 list icon popover', () => {
  it('searches built-in names case-insensitively by partial word', () => {
    const result = searchListIcons('CAMER')
    expect(result.builtins.some((icon) => icon.key === 'camera')).toBe(true)
    expect(searchListIcons('').builtins.length).toBeGreaterThan(50)
  })

  it('focuses the search on open, filters the Icons tab, and picking closes the popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Harness onChange={onChange} />)
    await waitFor(() => expect(search()).toHaveFocus())

    await user.type(search(), 'camer')
    expect(screen.queryByRole('button', { name: 'bike' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'camera' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: 'i:camera', icon_color: null })
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })

  it('has no free-text emoji field, and the Emoji tab loads the full set in groups', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Harness onChange={onChange} />)
    expect(screen.queryByRole('textbox', { name: 'Use an emoji' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Emoji' }))
    expect(screen.getByRole('tab', { name: 'Emoji' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('group', { name: 'Smileys & emotion' })).toBeInTheDocument()
    await user.type(search(), 'camer')
    await user.click(await screen.findByRole('button', { name: '📷 camera' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: '📷', icon_color: null })
  })

  it('finds emoji by tag, and lists every group once they have all rendered', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: 'Emoji' }))
    await screen.findByRole('group', { name: 'Smileys & emotion' })
    expect(await screen.findByRole('group', { name: 'Flags' })).toBeInTheDocument()
    await user.type(search(), 'puppies')
    expect(await screen.findByRole('button', { name: '🐶 dog face' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Flags' })).not.toBeInTheDocument()
    await user.clear(search())
    await user.type(search(), 'zzzzqq')
    expect(await screen.findByText('No matching emoji.')).toBeInTheDocument()
  })

  it('keeps the colour behind a swatch: disabled for emoji, a nested panel for built-ins that stays open on a colour', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { unmount } = renderWithProviders(
      <Harness onChange={onChange} initial={{ icon: '🪿', icon_color: null }} />,
    )
    expect(screen.queryByRole('group', { name: 'Icon color' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Icon color' })).toBeDisabled()
    unmount()

    renderWithProviders(
      <Harness onChange={onChange} initial={{ icon: 'i:camera', icon_color: null }} />,
    )
    await user.click(screen.getByRole('button', { name: 'Icon color' }))
    const indigo = await screen.findByRole('button', { name: 'Indigo' })
    expect(indigo).toHaveClass('size-10')
    await user.click(indigo)
    expect(onChange).toHaveBeenLastCalledWith({ icon: 'i:camera', icon_color: 'indigo' })
    // The colour panel closed, the main popover did not.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Indigo' })).toBeNull())
    expect(search()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Icon color: Indigo' })).toBeInTheDocument()
  })

  it('Remove applies the default and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <Harness onChange={onChange} initial={{ icon: 'i:camera', icon_color: 'teal' }} />,
    )
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenLastCalledWith({ icon: null, icon_color: null })
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })

  it('stays open when the write is refused', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} fail />)
    await user.type(search(), 'camer')
    await user.click(screen.getByRole('button', { name: 'camera' }))
    expect(search()).toBeInTheDocument()
  })

  it('moves through the grid with the arrow keys (one tab stop) and Esc returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness onChange={vi.fn()} />)
    await user.keyboard('{ArrowDown}')
    const first = screen.getAllByRole('button', { name: /^[a-z]/ }).find((b) => b.tabIndex === 0)
    expect(first).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(first?.nextElementSibling).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toHaveAccessibleName(expect.any(String))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Change icon' })).toHaveFocus())
  })

  it('uses token classes, touch-sized cells and no inline styles', async () => {
    renderWithProviders(<Harness onChange={vi.fn()} />)
    const camera = await screen.findByRole('button', { name: 'camera' })
    expect(camera).toHaveClass('size-10', 'focus-visible:outline-focus-ring')
    expect(camera).not.toHaveAttribute('style')
    expect(search().closest('[data-radix-popper-content-wrapper]')).not.toBeNull()
  })
})

describe('colour panel on touch devices', () => {
  it('stays open on a tap, even when the browser delivers a second click, with a coarse pointer', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    try {
      const user = userEvent.setup()
      renderWithProviders(
        <Harness onChange={vi.fn()} initial={{ icon: 'i:camera', icon_color: null }} />,
      )
      const swatch = screen.getByRole('button', { name: 'Icon color' })
      await user.click(swatch)
      await screen.findByRole('button', { name: 'Indigo' })
      fireEvent.click(swatch)
      await new Promise((resolve) => setTimeout(resolve, 400))
      expect(screen.getByRole('button', { name: 'Indigo' })).toBeInTheDocument()
      expect(swatch).toHaveAttribute('aria-expanded', 'true')
    } finally {
      window.matchMedia = original
    }
  })
})
