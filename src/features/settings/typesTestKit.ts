import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'
import type { TypeDefinition } from './api'

// Fixtures and the open-the-pane helper shared by the Types & fields pane tests.

export const typesUrl = `${location.origin}/api/v1/types`
export const treeUrl = `${location.origin}/api/v1/tree`

export const movie: TypeDefinition = {
  key: 'movie',
  name: 'Movies',
  default_icon: null,
  allows_price: false,
  default_sort_field: 'title',
  default_pinned_fields: [],
  is_locked: true,
  version: 3,
  fields: [
    { key: 'director', label: 'Director', type: 'text', position: 0, is_locked: true, version: 1 },
  ],
}
export const boardGame: TypeDefinition = {
  key: 'board_game',
  name: 'Board game',
  default_icon: null,
  allows_price: false,
  default_sort_field: null,
  default_pinned_fields: null,
  is_locked: false,
  version: 2,
  fields: [
    { key: 'rating', label: 'Rating', type: 'number', position: 0, is_locked: false, version: 1 },
  ],
}

export async function openPane(types: TypeDefinition[] = [movie, boardGame], lists: object[] = []) {
  mockViewport(375)
  server.use(http.get(typesUrl, () => HttpResponse.json(types)))
  server.use(http.get(treeUrl, () => HttpResponse.json({ folders: [], lists })))
  const user = userEvent.setup()
  renderAt('/settings')
  await user.click(await screen.findByRole('button', { name: 'Types & fields' }))
  await screen.findByRole('list', { name: 'Types' })
  return user
}
