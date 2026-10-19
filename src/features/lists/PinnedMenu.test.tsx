import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PinnedMenu } from './PinnedMenu'
import type { List } from './api'
import type { ItemType } from '../items/api'
import { mockTypes } from '../../mocks/types'

type Pinned = List['pinned_fields']

/** The menu is controlled by the list, so the harness keeps the state and records the PATCHes. */
function Harness({
  type,
  initial,
  patches,
}: {
  type: ItemType
  initial: Pinned
  patches: Pinned[]
}) {
  const [pinned, setPinned] = useState<Pinned>(initial)
  const definition = mockTypes.find((candidate) => candidate.key === type)!
  return (
    <PinnedMenu
      list={{ type, pinned_fields: pinned }}
      definition={definition}
      onChange={(next) => {
        setPinned(next)
        patches.push(next)
      }}
      onReset={() => {
        setPinned(null)
        patches.push(null)
      }}
    />
  )
}

function renderMenu(type: ItemType, initial: Pinned) {
  const patches: Pinned[] = []
  const user = userEvent.setup()
  render(<Harness type={type} initial={initial} patches={patches} />)
  const open = async () => {
    await user.click(screen.getByRole('button', { name: /Pinned fields/ }))
    return screen.findByRole('menu')
  }
  const item = (name: string | RegExp) =>
    within(screen.getByRole('menu')).getByRole('menuitemcheckbox', { name })
  return { user, open, item, patches }
}

describe('F009-W3 pinned fields are an ordered pair', () => {
  it('two fields can be ticked in a row, in the order they are ticked', async () => {
    const { open, item, patches } = renderMenu('movie', [])

    const menu = await open()
    await item('Release year').click()
    // The menu stays open on select, so the second field takes no second opening.
    expect(menu).toBeInTheDocument()
    await item('Runtime').click()

    expect(patches).toEqual([['release_year'], ['release_year', 'runtime_minutes']])
  })

  it('shows the effective selection (the type default) with the order written on it', async () => {
    const { open, item } = renderMenu('movie', null)

    await open()
    expect(item('Runtime')).toBeChecked()
    expect(item('Runtime')).toHaveAccessibleDescription('Pinned 1 of 3')
    expect(item('Runtime')).toHaveTextContent('1')
    expect(item('Streaming')).toBeChecked()
    expect(item('Streaming')).toHaveAccessibleDescription('Pinned 2 of 3')
    expect(item('Release year')).not.toBeChecked()
  })

  it('F016-W3 a third field can be pinned while two are', async () => {
    const { open, item } = renderMenu('car', ['model_year', 'price'])

    await open()
    expect(item('Power')).not.toHaveAttribute('aria-disabled')
  })

  it('F016-W3 a fourth field is disabled while three are pinned', async () => {
    const { open, item } = renderMenu('car', ['model_year', 'price', 'power_hp'])

    await open()
    expect(item('Power')).toBeChecked()
    expect(item('Power')).toHaveAccessibleDescription('Pinned 3 of 3')
    expect(item('Fuel')).toHaveAttribute('aria-disabled', 'true')
  })

  it('unpinning the first promotes the second to first', async () => {
    const { open, item, patches } = renderMenu('movie', ['runtime_minutes', 'streaming'])

    await open()
    await item('Runtime').click()

    expect(patches).toEqual([['streaming']])
    // Only one is left, so the free fields are offered again.
    expect(item('Release year')).not.toHaveAttribute('aria-disabled')
  })

  it('unticking a second pinned field drops it and leaves the first in place', async () => {
    const { open, item, patches } = renderMenu('movie', ['runtime_minutes', 'streaming'])

    await open()
    await item('Streaming').click()

    expect(patches).toEqual([['runtime_minutes']])
  })

  it('"Reset to default" sends null', async () => {
    const { open, patches, user } = renderMenu('movie', ['release_year'])

    await open()
    await user.click(screen.getByRole('menuitem', { name: 'Reset to default' }))

    expect(patches).toEqual([null])
  })

  it('F009-W2 offers no price on a movie list', async () => {
    const { open } = renderMenu('movie', [])

    await open()
    expect(
      within(screen.getByRole('menu')).queryByRole('menuitemcheckbox', { name: 'Price' }),
    ).not.toBeInTheDocument()
  })

  it('F009-W2 offers price on a car list', async () => {
    const { open, item } = renderMenu('car', [])

    await open()
    expect(item('Price')).toBeInTheDocument()
  })

  it('is reachable and operable from the keyboard', async () => {
    const { user, item, patches } = renderMenu('movie', [])

    const trigger = screen.getByRole('button', { name: /Pinned fields/ })
    await user.tab()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    // Radix highlights the first item when the menu opens.
    await waitFor(() => expect(item('Release year')).toHaveAttribute('data-highlighted'))
    await user.keyboard('{Enter}')

    expect(patches).toEqual([['release_year']])
  })
})
