import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import lock from '../../../api/openapi.lock.json'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'

const readyz = `${location.origin}/readyz`

async function openConnection() {
  mockViewport(1280)
  renderAt('/settings')
  const heading = await screen.findByRole('heading', { level: 2, name: 'Connection' })
  return within(heading.closest('section')!)
}

describe('F006-W9 settings: connection', () => {
  it('shows the backend as Ready after /readyz answers 200', async () => {
    const section = await openConnection()
    expect(await section.findByText('Ready')).toBeInTheDocument()
    expect(section.getByRole('status')).toHaveTextContent('Ready')
  })

  it('shows Unreachable on a 503 and when the server cannot be reached', async () => {
    server.use(http.get(readyz, () => new HttpResponse('database unavailable', { status: 503 })))
    const section = await openConnection()
    expect(await section.findByText('Unreachable')).toBeInTheDocument()
  })

  it('shows Unreachable on a network error', async () => {
    server.use(http.get(readyz, () => HttpResponse.error()))
    const section = await openConnection()
    expect(await section.findByText('Unreachable')).toBeInTheDocument()
  })

  it('Check again probes /readyz once more and shows the new answer', async () => {
    let calls = 0
    let healthy = false
    server.use(
      http.get(readyz, () => {
        calls += 1
        return healthy
          ? new HttpResponse('ok')
          : new HttpResponse('database unavailable', { status: 503 })
      }),
    )
    const user = userEvent.setup()
    const section = await openConnection()
    await section.findByText('Unreachable')
    expect(calls).toBe(1)
    healthy = true
    await user.click(section.getByRole('button', { name: 'Check again' }))
    expect(await section.findByText('Ready')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('shows the same-origin API address, the contract tag and the app version', async () => {
    const section = await openConnection()
    expect(section.getByText(`${window.location.origin}/api`)).toBeInTheDocument()
    expect(section.getByText(lock.tag)).toBeInTheDocument()
    expect(lock.tag).toMatch(/^api-v\d+\.\d+\.\d+$/)
    expect(section.getByText(__APP_VERSION__)).toBeInTheDocument()
    await section.findByText('Ready')
  })

  it('the shell no longer shows a backend indicator', async () => {
    mockViewport(1280)
    renderAt('/')
    await screen.findByRole('heading', { name: 'Home' })
    expect(screen.queryByText(/^Backend:/)).not.toBeInTheDocument()
  })
})
