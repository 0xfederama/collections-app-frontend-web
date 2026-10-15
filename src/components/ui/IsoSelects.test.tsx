import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CountrySelect, CurrencySelect } from './IsoSelects'

describe('CountrySelect', () => {
  it('shows the label of the selected code', () => {
    render(<CountrySelect label="Country" value="IT" />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('Italy (IT)')
  })

  it('typing "ital" filters to Italy', async () => {
    const user = userEvent.setup()
    render(<CountrySelect label="Country" />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'ital')
    const options = await screen.findAllByRole('option')
    expect(options.some((o) => /Italy \(IT\)/.test(o.textContent ?? ''))).toBe(true)
    expect(options.length).toBeLessThan(5)
  })

  it('selects with ArrowDown + Enter and reports the ISO code', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CountrySelect label="Country" onValueChange={onValueChange} />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'italy')
    await screen.findByRole('listbox')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange.mock.calls[0]![0]).toMatch(/^[A-Z]{2}$/)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('Enter right after typing selects the first match, IT for "italy"', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CountrySelect label="Country" onValueChange={onValueChange} />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'italy{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('IT')
  })

  it('Escape closes the list without selecting', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CountrySelect label="Country" onValueChange={onValueChange} />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'ital')
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('still displays a code that is not in the list', () => {
    render(<CountrySelect label="Country" value="XX" />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('XX')
  })

  it('shows the empty message when nothing matches', async () => {
    const user = userEvent.setup()
    render(<CountrySelect label="Country" />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'zzzzqq')
    expect(await screen.findByText('No matching country')).toBeInTheDocument()
  })
})

describe('CurrencySelect', () => {
  it('shows the label of the selected code', () => {
    render(<CurrencySelect label="Currency" value="EUR" />)
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR · Euro')
  })

  it('typing "euro" filters and Enter selects EUR', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CurrencySelect label="Currency" onValueChange={onValueChange} />)
    await user.type(screen.getByRole('combobox', { name: 'Currency' }), 'euro')
    const options = await screen.findAllByRole('option')
    expect(options.some((o) => /EUR · Euro/.test(o.textContent ?? ''))).toBe(true)
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('EUR')
  })

  it('Escape closes the list', async () => {
    const user = userEvent.setup()
    render(<CurrencySelect label="Currency" />)
    await user.type(screen.getByRole('combobox', { name: 'Currency' }), 'eu')
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('still displays an unknown code', () => {
    render(<CurrencySelect label="Currency" value="ZZZ" />)
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('ZZZ')
  })
})
