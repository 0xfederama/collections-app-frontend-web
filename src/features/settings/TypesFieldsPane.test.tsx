import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { openPane, typesUrl } from './typesTestKit'

describe('F014-W2 Types & fields pane', () => {
  it('marks built in types and fields read only while allowing an added field', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Movies.*Built in.*locked/ }))
    expect(
      screen.getByText('Built in fields are locked. You can add your own fields to this type.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Director')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename Director' })).not.toBeInTheDocument()

    let fieldRequest: { ifMatch: string | null; body: unknown } | undefined
    server.use(
      http.post(`${typesUrl}/movie/fields`, async ({ request }) => {
        fieldRequest = { ifMatch: request.headers.get('If-Match'), body: await request.json() }
        return HttpResponse.json(
          {
            key: 'rating',
            label: 'Rating',
            type: 'number',
            position: 1,
            is_locked: false,
            version: 1,
          },
          { status: 201 },
        )
      }),
    )
    await user.type(screen.getByLabelText('New field name'), 'Rating')
    await user.click(screen.getByRole('combobox', { name: 'Field type' }))
    await user.click(await screen.findByRole('option', { name: 'Number' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(fieldRequest).toEqual({ ifMatch: '"k-3"', body: { label: 'Rating', type: 'number' } })
  })

  it('offers no way to create, rename or delete a type, nor edit its defaults (F-022 W1)', async () => {
    const user = await openPane()
    expect(screen.queryByRole('button', { name: 'New type' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Books/ }))
    expect(screen.queryByRole('button', { name: 'Delete type' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Rename type')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Default sort field' })).not.toBeInTheDocument()
  })

  it('previews populated values before custom field deletion and uses the field snapshot', async () => {
    const user = await openPane()
    await user.click(screen.getByRole('button', { name: /Books/ }))
    let deleteHeader: string | null = null
    server.use(
      http.get(`${typesUrl}/book/fields/rating`, () =>
        HttpResponse.json({ populated_item_count: 2 }),
      ),
      http.delete(`${typesUrl}/book/fields/rating`, ({ request }) => {
        deleteHeader = request.headers.get('If-Match')
        return HttpResponse.json({ populated_item_count: 2 })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete Rating' }))
    const confirmation = await screen.findByRole('alertdialog', { name: 'Delete Rating?' })
    expect(within(confirmation).getByText(/2 items have a value/)).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete field' }))
    expect(deleteHeader).toBe('"kf-1"')
  })
})
