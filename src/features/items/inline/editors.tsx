import type { ReactNode } from 'react'
import { Select, TextField } from '../../../components/ui'
import type { Defaults, Draft } from '../form/draft'
import { inputId, type ErrorMap } from '../form/validate'
import type { FieldSpec } from './fields'
import { PriceInputs } from './PriceInputs'
import { StoresInputs, StreamingInputs } from './StreamingInputs'

/** What an editor needs from the field it edits: values, errors and setters. */
export interface FieldForm {
  draft: Draft
  errors: ErrorMap
  defaults: Defaults
  /** Sets a top-level draft field (and clears that input's error). */
  set: <K extends keyof Draft>(key: K, value: Draft[K], errorKey: string) => void
  setMeta: (key: string, value: string) => void
  clearError: (key: string) => void
  /** Applies a change to the draft and saves it at once (Remove price). */
  commit: (change: Partial<Draft>) => void
}

// One input per editor: its label is the row's label, so it is read by screen readers only.
const singleInput = '[&_label]:sr-only'
const NONE = '__none__'

/** The inputs of one field; the widget of a type field follows its config (`types/*.ts`). */
export function FieldInputs({
  spec,
  form,
  canRemovePrice,
  priceActions,
}: {
  spec: FieldSpec
  form: FieldForm
  canRemovePrice: boolean
  /** The ✓ and ✕ of the price editor, which sit on its second line (after "Add range"). */
  priceActions?: ReactNode
}) {
  const { draft, errors, set, setMeta } = form
  switch (spec.id) {
    case 'title':
      return (
        <div className={singleInput}>
          <TextField
            id={inputId('title')}
            label="Title"
            required
            autoComplete="off"
            value={draft.title}
            onChange={(event) => set('title', event.target.value, 'title')}
            error={errors.title}
          />
        </div>
      )
    case 'price':
      return <PriceInputs form={form} canRemove={canRemovePrice} actions={priceActions} />
    case 'website':
      return (
        <div className={singleInput}>
          <TextField
            id={inputId('website')}
            label="Website"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
            value={draft.website}
            onChange={(event) => set('website', event.target.value, 'website')}
            error={errors.website}
          />
        </div>
      )
    case 'years':
      return (
        <div className="grid grid-cols-1 gap-3">
          {(
            [
              ['first_air_year', 'First aired'],
              ['end_year', 'Ended'],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              id={inputId(`metadata.${key}`)}
              label={label}
              inputMode="numeric"
              autoComplete="off"
              value={draft.meta[key] ?? ''}
              onChange={(event) => setMeta(key, event.target.value)}
              error={errors[`metadata.${key}`]}
            />
          ))}
        </div>
      )
    case 'metadata.streaming':
      return <StreamingInputs form={form} />
  }

  const field = spec.field
  if (!field) return null
  if (field.type === 'stores') return <StoresInputs form={form} field={field} />
  const key = `metadata.${field.key}`
  const value = draft.meta[field.key] ?? ''
  const common = { id: inputId(key), label: field.label, error: errors[key] }
  if (field.type === 'boolean') {
    return (
      <div className={singleInput}>
        <Select
          {...common}
          options={[
            { value: NONE, label: 'Not set' },
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ]}
          value={value || NONE}
          onValueChange={(next) => setMeta(field.key, next === NONE ? '' : next)}
        />
      </div>
    )
  }
  const link = field.type === 'link'
  return (
    <div className={singleInput}>
      <TextField
        {...common}
        label={field.key === 'imdb_url' ? 'IMDb link' : field.label}
        type={field.type === 'date' ? 'date' : link ? 'url' : undefined}
        inputMode={field.type === 'number' ? 'decimal' : link ? 'url' : undefined}
        autoComplete="off"
        placeholder={field.key === 'imdb_url' ? 'https://www.imdb.com/title/tt…' : undefined}
        value={value}
        onChange={(event) => setMeta(field.key, event.target.value)}
      />
    </div>
  )
}
