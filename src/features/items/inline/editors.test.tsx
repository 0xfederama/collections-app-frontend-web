import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TypeField } from '../types'
import { draftFromItem, type Draft } from '../form/draft'
import type { Item } from '../api'
import { FieldInputs, type FieldForm } from './editors'
import type { FieldSpec } from './fields'
import { renderWithProviders } from '../../../test-utils'

const definition = {
  name: 'Board game',
  fields: [] as TypeField[],
}
const item: Item = {
  id: 'i1',
  list_id: 'l1',
  title: 'Brass',
  type: 'board_game',
  image: null,
  price: null,
  website: null,
  metadata: {},
  content_version: 0,
  sort_order: 0,
  version: 1,
  created_at: '2026-10-19T00:00:00Z',
  updated_at: '2026-10-19T00:00:00Z',
}

const typeField = (type: TypeField['type']): TypeField => ({
  key: 'custom',
  label: 'Custom field',
  type,
  position: 0,
  is_locked: false,
  version: 1,
})

function renderField(type: TypeField['type']) {
  const field = typeField(type)
  const draft: Draft = { ...draftFromItem(item, { ...definition, fields: [field] }) }
  const setMeta = vi.fn()
  const form: FieldForm = {
    draft,
    errors: {},
    defaults: { country: 'IT' },
    set: vi.fn(),
    setMeta,
    clearError: vi.fn(),
    commit: vi.fn(),
  }
  const spec: FieldSpec = {
    id: 'metadata.custom',
    label: field.label,
    errorKeys: ['metadata.custom'],
    take: (target) => target,
    isSet: () => false,
    field,
  }
  render(<FieldInputs spec={spec} form={form} canRemovePrice={false} />)
  return { setMeta, user: userEvent.setup() }
}

describe('F014-W3 typed custom field editors', () => {
  it.each([
    ['text', undefined, undefined],
    ['number', undefined, 'decimal'],
    ['date', 'date', undefined],
    ['link', 'url', 'url'],
  ] as const)(
    'renders a %s field with the matching native input hints',
    (type, inputType, mode) => {
      renderField(type)
      const input = screen.getByLabelText('Custom field')
      if (inputType) expect(input).toHaveAttribute('type', inputType)
      if (mode) expect(input).toHaveAttribute('inputmode', mode)
    },
  )

  it('renders yes/no as a nullable select and sends the boolean draft token', async () => {
    const { user, setMeta } = renderField('boolean')
    await user.click(screen.getByRole('combobox', { name: 'Custom field' }))
    await user.click(await screen.findByRole('option', { name: 'No' }))
    expect(setMeta).toHaveBeenCalledWith('custom', 'false')
  })
})

describe('F016-W4 stores editor', () => {
  it('ticks a store from the provider list into the draft as its key', async () => {
    const field = typeField('stores')
    const draft: Draft = { ...draftFromItem(item, { ...definition, fields: [field] }) }
    const setMeta = vi.fn()
    const form: FieldForm = {
      draft,
      errors: {},
      defaults: { country: 'IT' },
      set: vi.fn(),
      setMeta,
      clearError: vi.fn(),
      commit: vi.fn(),
    }
    const spec: FieldSpec = {
      id: 'metadata.custom',
      label: field.label,
      errorKeys: ['metadata.custom'],
      take: (target) => target,
      isSet: () => false,
      field,
    }
    const user = userEvent.setup()
    renderWithProviders(<FieldInputs spec={spec} form={form} canRemovePrice={false} />)
    await user.click(screen.getByRole('button', { name: /Custom field/ }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Kobo/ }))
    expect(setMeta).toHaveBeenCalledWith('custom', 'kobo')
  })
})
