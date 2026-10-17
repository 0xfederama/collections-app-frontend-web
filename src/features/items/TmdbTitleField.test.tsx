import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TmdbTitleField } from './TmdbTitleField'
import { renderWithProviders } from '../../test-utils'

describe('F013-W1 title lookup', () => {
  it('shows localized movie suggestions and selects one with the keyboard without replacing the query', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    const onSelectionChange = vi.fn()
    renderWithProviders(
      <TmdbTitleField
        kind="movie"
        title="The Mat"
        onTitleChange={onTitleChange}
        onSelectionChange={onSelectionChange}
      />,
    )

    const title = await screen.findByRole('combobox', { name: 'Title' })
    await user.click(title)
    const listbox = await screen.findByRole('listbox', { name: 'TMDB title suggestions' })
    expect(await screen.findByRole('option', { name: 'The Matrix (1999)' })).toBeInTheDocument()
    expect(listbox).toHaveTextContent('1999')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSelectionChange).toHaveBeenLastCalledWith(603)
    expect(title).toHaveValue('The Mat')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(listbox).not.toBeInTheDocument()
  })
})
