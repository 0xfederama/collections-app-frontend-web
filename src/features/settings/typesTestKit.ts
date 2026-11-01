import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'
import type { TypeDefinition } from './api'

// Fixtures and the open-the-pane helper shared by the Types & fields pane tests. Every type is a
// built-in (is_locked true, F-022); a custom field on it is what the pane can still add and remove.

export const typesUrl = `${location.origin}/api/v1/types`
export const treeUrl = `${location.origin}/api/v1/tree`

export const movie: TypeDefinition = {
  key: 'movie',
  name: 'Movies',
  default_icon: null,
  allows_price: false,
  default_sort_field: 'title',
  is_locked: true,
  version: 3,
  fields: [
    { key: 'director', label: 'Director', type: 'text', position: 0, is_locked: true, version: 1 },
  ],
}
export const book: TypeDefinition = {
  key: 'book',
  name: 'Books',
  default_icon: null,
  allows_price: false,
  default_sort_field: null,
  is_locked: true,
  version: 2,
  fields: [
    { key: 'author', label: 'Writer', type: 'text', position: 0, is_locked: true, version: 1 },
    { key: 'rating', label: 'Rating', type: 'number', position: 1, is_locked: false, version: 1 },
  ],
}

export async function openPane(types: TypeDefinition[] = [movie, book], lists: object[] = []) {
  mockViewport(375)
  server.use(http.get(typesUrl, () => HttpResponse.json(types)))
  server.use(http.get(treeUrl, () => HttpResponse.json({ folders: [], lists })))
  const user = userEvent.setup()
  renderAt('/settings')
  await user.click(await screen.findByRole('button', { name: 'Types & fields' }))
  await screen.findByRole('list', { name: 'Types' })
  return user
}
