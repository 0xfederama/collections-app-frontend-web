import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { lazyRoute } from './lazyRoute'

describe('lazyRoute', () => {
  it('shows a Loading skeleton first, then the component once the loader resolves', async () => {
    let resolve!: (component: () => React.ReactElement) => void
    const loader = new Promise<() => React.ReactElement>((r) => (resolve = r))
    const Route = lazyRoute(() => loader)

    render(<Route />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('Loaded page')).not.toBeInTheDocument()

    await act(async () => resolve(() => <p>Loaded page</p>))

    expect(await screen.findByText('Loaded page')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows nothing while loading when the fallback is null (overlay routes)', async () => {
    let resolve!: (component: () => React.ReactElement) => void
    const loader = new Promise<() => React.ReactElement>((r) => (resolve = r))
    const Route = lazyRoute(() => loader, { fallback: null })

    render(<Route />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await act(async () => resolve(() => <p>Loaded overlay</p>))
    expect(await screen.findByText('Loaded overlay')).toBeInTheDocument()
  })
})
