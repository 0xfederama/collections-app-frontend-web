import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { Inbox } from './icons'

describe('EmptyState', () => {
  it('renders heading, description and action', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items yet"
        description="Add your first item to get started."
        action={<Button>Add item</Button>}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'No items yet' })).toBeInTheDocument()
    expect(screen.getByText('Add your first item to get started.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('works without an action and honors headingLevel', () => {
    render(<EmptyState icon={Inbox} title="Empty" description="Nothing." headingLevel="h3" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Empty' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
