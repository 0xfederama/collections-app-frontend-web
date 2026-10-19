import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StoreChoices } from './StoreChoices'

const providers = [
  { key: 'amazon' as const, name: 'Amazon' },
  { key: 'bookshop' as const, name: 'Bookshop.org' },
  { key: 'kobo' as const, name: 'Kobo' },
]

describe('F016-W4 stores multi-choice', () => {
  it('names the chosen stores by their display name and lists every provider in order', async () => {
    const user = userEvent.setup()
    render(
      <StoreChoices
        value={['kobo']}
        onChange={vi.fn()}
        providers={providers}
        label="Where to get it"
      />,
    )
    const trigger = screen.getByRole('button', { name: /Where to get it/ })
    expect(trigger).toHaveTextContent('Kobo')
    await user.click(trigger)
    const items = await screen.findAllByRole('menuitemcheckbox')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Amazon'),
      expect.stringContaining('Bookshop.org'),
      expect.stringContaining('Kobo'),
    ])
  })

  it('ticks a store on and keeps the menu open for the next one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <StoreChoices
        value={['kobo']}
        onChange={onChange}
        providers={providers}
        label="Where to get it"
      />,
    )
    await user.click(screen.getByRole('button', { name: /Where to get it/ }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Amazon/ }))
    expect(onChange).toHaveBeenLastCalledWith(['kobo', 'amazon'])
    expect(screen.getByRole('menuitemcheckbox', { name: /Bookshop/ })).toBeInTheDocument()
  })

  it('unticks a chosen store', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <StoreChoices
        value={['kobo', 'bookshop']}
        onChange={onChange}
        providers={providers}
        label="Where to get it"
      />,
    )
    await user.click(screen.getByRole('button', { name: /Where to get it/ }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Kobo/ }))
    expect(onChange).toHaveBeenLastCalledWith(['bookshop'])
  })
})
