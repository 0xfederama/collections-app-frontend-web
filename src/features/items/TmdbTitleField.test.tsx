import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TmdbTitleField } from './TmdbTitleField'
import { renderWithProviders } from '../../test-utils'

describe('F013-W1 title lookup', () => {
  it('shows localized movie suggestions and selects the full title with the keyboard', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onSuggestionSelect = vi.fn()
    renderWithProviders(
      <TmdbTitleField
        type="movie"
        title="The Mat"
        onTitleChange={onTitleChange}
        onSelectionChange={onSelectionChange}
        onSuggestionSelect={onSuggestionSelect}
      />,
    )

    const title = await screen.findByRole('combobox', { name: 'Title' })
    await user.click(title)
    const listbox = await screen.findByRole('listbox', { name: 'TMDB title suggestions' })
    expect(await screen.findByRole('option', { name: 'The Matrix (1999)' })).toBeInTheDocument()
    expect(listbox).toHaveTextContent('1999')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(onTitleChange).toHaveBeenLastCalledWith('The Matrix')
    expect(onSelectionChange).toHaveBeenLastCalledWith(603)
    expect(onSuggestionSelect).toHaveBeenLastCalledWith({ title: 'The Matrix', tmdb_id: 603 })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(listbox).not.toBeInTheDocument()
  })

  it('sends the same full selection when chosen with the pointer', async () => {
    const user = userEvent.setup()
    const onTitleChange = vi.fn()
    const onSelectionChange = vi.fn()
    const onSuggestionSelect = vi.fn()
    renderWithProviders(
      <TmdbTitleField
        type="movie"
        title="The Mat"
        onTitleChange={onTitleChange}
        onSelectionChange={onSelectionChange}
        onSuggestionSelect={onSuggestionSelect}
      />,
    )

    await user.click(await screen.findByRole('combobox', { name: 'Title' }))
    await user.click(await screen.findByRole('option', { name: 'The Matrix (1999)' }))

    expect(onTitleChange).toHaveBeenLastCalledWith('The Matrix')
    expect(onSelectionChange).toHaveBeenLastCalledWith(603)
    expect(onSuggestionSelect).toHaveBeenLastCalledWith({ title: 'The Matrix', tmdb_id: 603 })
  })
})
