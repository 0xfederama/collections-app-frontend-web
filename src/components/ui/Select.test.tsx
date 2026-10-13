import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'it', label: 'Italy' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
]

describe('Select', () => {
  it('has the label as the accessible name of the trigger and shows the placeholder', () => {
    render(<Select label="Country" options={options} placeholder="Pick one" />)
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveTextContent('Pick one')
  })

  it('opens with the keyboard, chooses an option and calls onValueChange', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Country" options={options} onValueChange={onValueChange} />)
    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await user.click(screen.getByRole('option', { name: 'France' }))
    expect(onValueChange).toHaveBeenCalledWith('fr')
  })

  it('selects with the arrow keys and Enter', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Country" options={options} onValueChange={onValueChange} />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    await screen.findByRole('listbox')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('shows the label of the current value', () => {
    render(<Select label="Country" options={options} value="de" />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('Germany')
  })

  it('Escape closes the list without selecting', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Country" options={options} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Country' }))
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('links hint and error to the trigger', () => {
    const { rerender } = render(<Select label="Country" options={options} hint="Where from" />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveAccessibleDescription(
      'Where from',
    )
    rerender(<Select label="Country" options={options} hint="Where from" error="Required" />)
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAccessibleDescription('Required')
  })

  it('does not open when disabled', async () => {
    render(<Select label="Country" options={options} disabled />)
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toBeDisabled()
    await userEvent.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
