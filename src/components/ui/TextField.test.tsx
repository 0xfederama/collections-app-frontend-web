import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('associates the label with the input', async () => {
    render(<TextField label="Name" />)
    const input = screen.getByLabelText('Name')
    expect(input.tagName).toBe('INPUT')
    await userEvent.type(input, 'abc')
    expect(input).toHaveValue('abc')
  })

  it('links the hint through aria-describedby and is not invalid', () => {
    render(<TextField label="Name" hint="Shown on the card" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAccessibleDescription('Shown on the card')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('error sets aria-invalid and aria-describedby pointing at the error text', () => {
    render(<TextField label="Name" error="Required" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Required')
  })

  it('shows the error instead of the hint when both are given', () => {
    render(<TextField label="Name" hint="Helpful" error="Bad value" />)
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Bad value')
    expect(screen.queryByText('Helpful')).not.toBeInTheDocument()
  })

  it('renders prefix and suffix slots', () => {
    render(<TextField label="Price" prefix="$" suffix="cc" />)
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('cc')).toBeInTheDocument()
  })

  it('marks required fields and passes through required', () => {
    render(<TextField label="Name" required />)
    expect(screen.getByLabelText(/Name/)).toBeRequired()
  })

  it('honors disabled and a custom id', () => {
    render(<TextField label="Name" id="custom" disabled />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('id', 'custom')
    expect(input).toBeDisabled()
  })
})
