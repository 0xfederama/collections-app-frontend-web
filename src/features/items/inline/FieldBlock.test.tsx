import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { exampleResponses } from '../../../mocks/fixtures'
import { mockTypes } from '../../../mocks/types'
import { renderWithProviders } from '../../../test-utils'
import type { Item } from '../api'
import { FieldBlock } from './FieldBlock'

const matrix = exampleResponses.getItem.body as Item
const movie = mockTypes.find((candidate) => candidate.key === 'movie')!

const LONG_INSTAGRAM = 'https://www.instagram.com/some.very.long.account.name.that.keeps.going/'

function renderDetails(over: Partial<Item> = {}) {
  renderWithProviders(
    <MemoryRouter>
      <FieldBlock item={{ ...matrix, ...over }} definition={movie} />
    </MemoryRouter>,
  )
}

describe('roadmap 28 website on the item page', () => {
  it('is an anchor to the site, in a new tab, with the site icon in front', () => {
    renderDetails({ website: 'https://www.ducati.com/' })
    const link = screen.getByRole('link', { name: 'https://www.ducati.com/ (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://www.ducati.com/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    // No favicon endpoint yet (roadmap 28): the globe stands in front of the address.
    expect(link.querySelector('svg')).not.toBeNull()
  })

  it('clicking the link does not open the field editor; the pen still does', async () => {
    const user = userEvent.setup()
    renderDetails({ website: 'https://www.ducati.com/' })
    await user.click(screen.getByRole('link', { name: /ducati/ }))
    expect(screen.queryByRole('textbox', { name: 'Website' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit website' }))
    expect(await screen.findByRole('textbox', { name: 'Website' })).toBeInTheDocument()
  })

  it('a long Instagram address truncates with an ellipsis instead of breaking the row', () => {
    renderDetails({ website: LONG_INSTAGRAM })
    const link = screen.getByRole('link', { name: `${LONG_INSTAGRAM} (opens in a new tab)` })
    // The flex chain can shrink: the anchor and the address text both allow it to be narrower.
    expect(link).toHaveClass('flex', 'min-w-0', 'max-w-full')
    const text = within(link).getByText(LONG_INSTAGRAM)
    expect(text).toHaveClass('min-w-0', 'truncate')
    expect(text).not.toHaveClass('break-all')
  })

  it('the value cell may shrink and the hover bar keeps the room for the pen', () => {
    renderDetails({ website: LONG_INSTAGRAM })
    const link = screen.getByRole('link', { name: `${LONG_INSTAGRAM} (opens in a new tab)` })
    const bar = link.parentElement!
    expect(bar).toHaveClass('pr-9')
    expect(bar.closest('dd')).toHaveClass('min-w-0')
  })
})
