import { screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ItemEntry } from './ItemEntry'
import type { ItemSummary } from './api'
import type { TypeDefinition } from '../items/types'
import { mockTypes } from '../../mocks/types'
import { renderWithProviders } from '../../test-utils'

const item = (over: Partial<ItemSummary> = {}): ItemSummary => ({
  id: 'i1',
  list_id: 'l1',
  title: 'Alien',
  type: 'movie',
  image: null,
  price: null,
  website: null,
  metadata: { runtime_minutes: 117 },
  content_version: 0,
  sort_order: 0,
  version: 1,
  created_at: '2026-10-14T09:00:00Z',
  updated_at: '2026-10-14T09:00:00Z',
  ...over,
})

const bookDefinition: TypeDefinition = {
  key: 'book',
  name: 'Book',
  default_icon: null,
  allows_price: true,
  default_sort_field: null,
  default_pinned_fields: ['author', 'pages', 'stores'],
  is_locked: true,
  version: 1,
  fields: [
    { key: 'author', label: 'Author', type: 'text', position: 0, is_locked: true, version: 1 },
    { key: 'pages', label: 'Pages', type: 'number', position: 1, is_locked: true, version: 1 },
    { key: 'stores', label: 'Stores', type: 'stores', position: 2, is_locked: true, version: 1 },
  ],
}

function entry(
  pinned: string[],
  mode: 'compact' | 'thumbnail' | 'grid',
  over: Partial<ItemSummary> = {},
) {
  const type = over.type ?? 'movie'
  const definition =
    type === 'book' ? bookDefinition : mockTypes.find((candidate) => candidate.key === type)!
  renderWithProviders(
    <MemoryRouter>
      <ul>
        <ItemEntry
          item={item(over)}
          mode={mode}
          type={type}
          definition={definition}
          pinned={pinned}
          search=""
          onOpen={() => {}}
        />
      </ul>
    </MemoryRouter>,
  )
  return screen.getByRole('listitem')
}

/** The row's own text pieces, in the order they are read (hidden decoration is not read). */
const readOrder = (row: HTMLElement) =>
  [...row.querySelectorAll('*')]
    .filter((node) => node.children.length === 0 && !node.closest('[aria-hidden="true"]'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((text) => text !== '')

describe('F009-W3 the first pinned field reads next to the title, the second in the corner', () => {
  it.each(['compact', 'thumbnail', 'grid'] as const)(
    '%s: title, then the first pinned field, then the second',
    (mode) => {
      const row = entry(['runtime_minutes', 'release_year'], mode, {
        metadata: { runtime_minutes: 117, release_year: 1979 },
      })
      const order = readOrder(row)
      expect(order.indexOf('Alien')).toBe(0)
      expect(order.indexOf('117 min')).toBe(1)
      expect(order.indexOf('1979')).toBe(2)
    },
  )

  it('a TV show combines seasons and episodes into one 5×7 piece', () => {
    const row = entry(['seasons', 'episodes_per_season'], 'thumbnail', {
      type: 'tv_show',
      metadata: { seasons: 5, episodes_per_season: 7, episode_minutes: 45 },
    })
    expect(readOrder(row)).toEqual(['Alien', '5×7'])
  })

  it('a second pinned field that is streaming draws service icons', () => {
    const row = entry(['release_year', 'streaming'], 'thumbnail', {
      metadata: { release_year: 1979, streaming: { platforms: ['Netflix'] } },
    })
    expect(readOrder(row)).toEqual(['Alien', '1979'])
    expect(within(row).getByRole('img', { name: 'Netflix' })).toBeInTheDocument()
  })

  it('pins nothing when the list stores an empty selection', () => {
    const row = entry([], 'grid')
    expect(readOrder(row)).toEqual(['Alien'])
  })
})

describe('F016-W3 three pins: two beside the title, the third in the corner', () => {
  it.each(['compact', 'thumbnail', 'grid'] as const)(
    '%s: title, author and pages, then the stores as tiles',
    async (mode) => {
      const row = entry(['author', 'pages', 'stores'], mode, {
        type: 'book',
        title: 'Dune',
        metadata: { author: 'Frank Herbert', pages: 412, stores: ['amazon', 'kobo'] },
      })
      const order = readOrder(row)
      expect(order.indexOf('Dune')).toBe(0)
      expect(order.indexOf('Frank Herbert · 412 p.')).toBe(1)
      // F016-W4: the tiles are named by the store's display name, once the provider list loads.
      expect(await within(row).findByRole('img', { name: 'Amazon' })).toBeInTheDocument()
      expect(within(row).getByRole('img', { name: 'Kobo' })).toBeInTheDocument()
    },
  )

  it('a book with no stores selected shows no tiles', () => {
    const row = entry(['author', 'pages', 'stores'], 'compact', {
      type: 'book',
      metadata: { author: 'Frank Herbert' },
    })
    expect(within(row).queryByRole('img')).not.toBeInTheDocument()
  })

  it('a TV show with seasons, episodes and a third pin keeps 5×7', () => {
    const row = entry(['seasons', 'episodes_per_season', 'episode_minutes'], 'thumbnail', {
      type: 'tv_show',
      metadata: { seasons: 5, episodes_per_season: 7, episode_minutes: 45 },
    })
    expect(readOrder(row)).toEqual(['Alien', '5×7', '45 min'])
  })
})
