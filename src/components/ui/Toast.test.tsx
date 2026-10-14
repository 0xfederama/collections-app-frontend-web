import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast, type ToastOptions } from './Toast'

function Trigger({ options }: { options: ToastOptions }) {
  const toast = useToast()
  return <button onClick={() => toast(options)}>Fire</button>
}

function setup(options: ToastOptions) {
  render(
    <ToastProvider>
      <Trigger options={options} />
    </ToastProvider>,
  )
}

describe('Toast', () => {
  it.each(['success', 'error', 'info'] as const)(
    'announces a %s toast with title and description',
    async (kind) => {
      setup({ kind, title: `Title ${kind}`, description: `Body ${kind}` })
      await userEvent.click(screen.getByRole('button', { name: 'Fire' }))
      expect(await screen.findByText(`Title ${kind}`)).toBeInTheDocument()
      expect(screen.getByText(`Body ${kind}`)).toBeInTheDocument()
      // Radix mirrors the toast text into a live region announcement.
      const live = document.querySelector('[role="status"], [role="alert"], [aria-live]')
      expect(live).not.toBeNull()
    },
  )

  it('defaults to info and renders without a description', async () => {
    setup({ title: 'Just a title' })
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }))
    expect(await screen.findByText('Just a title')).toBeInTheDocument()
  })

  it('renders a notifications region', () => {
    setup({ title: 'x' })
    expect(screen.getByRole('region', { name: /Notifications/ })).toBeInTheDocument()
  })

  it('can be dismissed with the Dismiss button', async () => {
    const user = userEvent.setup()
    setup({ kind: 'success', title: 'Saved' })
    await user.click(screen.getByRole('button', { name: 'Fire' }))
    await screen.findByText('Saved')
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    await vi.waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument())
  })

  it('runs the action and dismisses the toast', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    setup({ kind: 'success', title: 'Restored', action: { label: 'Open', onAction } })
    await user.click(screen.getByRole('button', { name: 'Fire' }))
    await screen.findByText('Restored')
    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(onAction).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(screen.queryByText('Restored')).not.toBeInTheDocument())
  })

  it('useToast outside a ToastProvider throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Trigger options={{ title: 'x' }} />)).toThrow(
      'useToast must be used inside <ToastProvider>',
    )
    spy.mockRestore()
  })
})
