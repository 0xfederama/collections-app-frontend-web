import { useState } from 'react'
import type { TypeField } from '../api'
import type { fieldTypes } from './model'

/** The drafts of the "add" and "rename" field forms in the Types & fields pane. */
export type FieldDrafts = {
  fieldLabel: string
  setFieldLabel: (label: string) => void
  fieldType: (typeof fieldTypes)[number]['value']
  setFieldType: (type: (typeof fieldTypes)[number]['value']) => void
  editingField: TypeField | null
  setEditingField: (field: TypeField | null) => void
  fieldDraft: string
  setFieldDraft: (label: string) => void
}

/**
 * Held by TypesFieldsPane, before its early returns, so a draft survives the loading and error
 * views and the no-selection view (FieldsSection unmounts in all of them).
 */
export function useFieldDrafts(): FieldDrafts {
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState<(typeof fieldTypes)[number]['value']>('text')
  const [editingField, setEditingField] = useState<TypeField | null>(null)
  const [fieldDraft, setFieldDraft] = useState('')
  return {
    fieldLabel,
    setFieldLabel,
    fieldType,
    setFieldType,
    editingField,
    setEditingField,
    fieldDraft,
    setFieldDraft,
  }
}
