import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ItemEntry } from './ItemEntry'
import type { ItemSummary } from './api'
import { mockKinds } from '../../mocks/kinds'

const item = (over: Partial<ItemSummary> = {}): ItemSummary => ({
  id: 'i1',
  list_id: 'l1',
  title: 'Alien',
  kind: 'movie',
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

function entry(
  pinned: string[],
  mode: 'compact' | 'thumbnail' | 'grid',
  over: Partial<ItemSummary> = {},
) {
  const kind = over.kind ?? 'movie'
  const definition = mockKinds.find((candidate) => candidate.key === kind)!
  render(
    <MemoryRouter>
      <ul>
        <ItemEntry
          item={item(over)}
          mode={mode}
          kind={kind}
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
      kind: 'tv_show',
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
