import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TextArea } from './TextArea'

describe('TextArea', () => {
  it('associates the label with the textarea', async () => {
    render(<TextArea label="Notes" />)
    const area = screen.getByLabelText('Notes')
    expect(area.tagName).toBe('TEXTAREA')
    await userEvent.type(area, 'hello')
    expect(area).toHaveValue('hello')
  })

  it('links the hint via aria-describedby', () => {
    render(<TextArea label="Notes" hint="Markdown not supported" />)
    expect(screen.getByLabelText('Notes')).toHaveAccessibleDescription('Markdown not supported')
  })

  it('error sets aria-invalid and aria-describedby, replacing the hint', () => {
    render(<TextArea label="Notes" hint="A hint" error="Too long" />)
    const area = screen.getByLabelText('Notes')
    expect(area).toHaveAttribute('aria-invalid', 'true')
    expect(area).toHaveAccessibleDescription('Too long')
    expect(screen.queryByText('A hint')).not.toBeInTheDocument()
  })

  it('is not marked invalid without an error', () => {
    render(<TextArea label="Notes" />)
    expect(screen.getByLabelText('Notes')).not.toHaveAttribute('aria-invalid')
  })
})
