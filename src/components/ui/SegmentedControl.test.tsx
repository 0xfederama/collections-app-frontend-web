import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'
import { LayoutGrid, List } from './icons'

const options = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'rows', label: 'Rows' },
]

function Stateful({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('grid')
  return (
    <SegmentedControl
      aria-label="View"
      options={options}
      value={value}
      onValueChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
    />
  )
}

describe('SegmentedControl', () => {
  it('is a named radiogroup with radios, current one checked', () => {
    render(<Stateful />)
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'List' })).not.toBeChecked()
  })

  it('arrow keys move the selection and call onValueChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Stateful onChange={onChange} />)
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith('list')
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked()
    await user.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith('grid')
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked()
  })

  it('clicking an option selects it', async () => {
    const onChange = vi.fn()
    render(<Stateful onChange={onChange} />)
    await userEvent.click(screen.getByText('Rows'))
    expect(onChange).toHaveBeenCalledWith('rows')
  })

  it('an icon-only option stays accessible by name', () => {
    render(
      <SegmentedControl
        aria-label="View"
        value="grid"
        onValueChange={() => {}}
        options={[
          { value: 'grid', label: 'Grid view', icon: <LayoutGrid />, iconOnly: true },
          { value: 'list', label: 'List view', icon: <List />, iconOnly: true },
        ]}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Grid view' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'List view' })).toBeInTheDocument()
    expect(screen.getByText('Grid view')).toHaveClass('sr-only')
  })

  it('does not select disabled options', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        aria-label="View"
        value="grid"
        onValueChange={onChange}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List', disabled: true },
        ]}
      />,
    )
    expect(screen.getByRole('radio', { name: 'List' })).toBeDisabled()
    await userEvent.click(screen.getByText('List'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
