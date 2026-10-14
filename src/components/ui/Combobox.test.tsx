import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Combobox } from './Combobox'

const options = [
  { value: 'it', label: 'Italy' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
]

describe('Combobox', () => {
  it('exposes a labelled combobox, collapsed initially', () => {
    render(<Combobox label="Country" options={options} />)
    const input = screen.getByRole('combobox', { name: 'Country' })
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('typing filters options case-insensitively', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Country" options={options} />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'FR')
    const listed = await screen.findAllByRole('option')
    expect(listed).toHaveLength(1)
    expect(listed[0]).toHaveTextContent('France')
  })

  it('ArrowDown then Enter selects the next option', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Combobox label="Country" options={options} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Country' }))
    await screen.findByRole('listbox')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('fr')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ArrowDown on a closed combobox opens it and keeps focus in the input', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Country" options={options} />)
    const input = screen.getByRole('combobox', { name: 'Country' })
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-activedescendant')
  })

  it('Enter after typing selects the first match', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Combobox label="Country" options={options} onValueChange={onValueChange} />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'ger{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('de')
  })

  it('shows the empty message when nothing matches', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Country" options={options} emptyMessage="Nothing here" />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'zzz')
    expect(await screen.findByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('uses a default empty message', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Country" options={options} />)
    await user.type(screen.getByRole('combobox', { name: 'Country' }), 'zzz')
    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })

  it('Escape closes the list', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Country" options={options} />)
    const input = screen.getByRole('combobox', { name: 'Country' })
    await user.click(input)
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking an option selects it', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Combobox label="Country" options={options} onValueChange={onValueChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Country' }))
    await user.click(await screen.findByRole('option', { name: 'Germany' }))
    expect(onValueChange).toHaveBeenCalledWith('de')
  })

  it('shows the selected label and marks it aria-selected', async () => {
    const user = userEvent.setup()
    render(<Combobox label="Country" options={options} value="fr" />)
    const input = screen.getByRole('combobox', { name: 'Country' })
    expect(input).toHaveValue('France')
    await user.click(input)
    expect(await screen.findByRole('option', { name: 'France' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('does not select disabled options', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Combobox
        label="Country"
        options={[{ value: 'it', label: 'Italy', disabled: true }]}
        onValueChange={onValueChange}
      />,
    )
    await user.click(screen.getByRole('combobox', { name: 'Country' }))
    await user.click(await screen.findByRole('option', { name: 'Italy' }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('links error to the input', () => {
    render(<Combobox label="Country" options={options} error="Required" />)
    const input = screen.getByRole('combobox', { name: 'Country' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Required')
  })
})
