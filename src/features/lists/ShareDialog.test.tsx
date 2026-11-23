import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareDialog } from './ShareDialog'

const setup = () =>
  render(<ShareDialog open onOpenChange={() => {}} listName="Movies" text={'* A\n* B'} />)
const stub = (name: string, value: unknown) =>
  Object.defineProperty(navigator, name, { value, configurable: true })

afterEach(() => {
  stub('clipboard', undefined)
  Reflect.deleteProperty(document, 'execCommand')
})

describe('roadmap 40 share dialog', () => {
  it('shows the text selected, titled with the list name', async () => {
    setup()
    expect(await screen.findByRole('dialog', { name: 'Share Movies' })).toBeInTheDocument()
    const field = screen.getByRole('textbox')
    expect(field).toHaveValue('* A\n* B')
    expect(field).toHaveAttribute('readonly')
    await waitFor(() => expect(field).toHaveFocus())
  })

  it('Copy with the clipboard says Copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stub('clipboard', { writeText })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Copy' }))
    expect(await screen.findByText('Copied')).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith('* A\n* B')
  })

  it('Copy without a clipboard uses execCommand', async () => {
    stub('clipboard', undefined)
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Copy' }))
    expect(await screen.findByText('Copied')).toBeInTheDocument()
    expect(exec).toHaveBeenCalledWith('copy')
  })

  it('shows the manual hint when copying fails', async () => {
    stub('clipboard', undefined)
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true })
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Copy' }))
    expect(await screen.findByText(/Select the text and copy it manually/)).toBeInTheDocument()
  })
})
