import type { ReactNode } from 'react'
import { Button, Select, TextField, kindLabels } from '../../../components/ui'
import { Plus, X } from '../../../components/ui/icons'
import { CountrySelect, CurrencySelect } from '../../../components/ui/IsoSelects'
import { kindFields, type Field } from '../kinds'
import {
  INITIAL_CURRENCY,
  inputId,
  simpleFields,
  type Defaults,
  type Draft,
  type ErrorMap,
} from './draft'

/** What the sections need from the form: values, errors and setters. */
export interface FormState {
  draft: Draft
  errors: ErrorMap
  defaults: Defaults
  /** Sets a top-level draft field (and clears that input's error). */
  set: <K extends keyof Draft>(key: K, value: Draft[K], errorKey: string) => void
  setMeta: (key: string, value: string) => void
  clearError: (key: string) => void
}

export function FormSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-sm font-semibold text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  )
}

const NONE = '__none__'

/** Title, price (only once added) and website (UI_SPEC §4 "Basics"). */
export function BasicsFields({ form }: { form: FormState }) {
  const { draft, errors, set } = form
  const currency = draft.currency || INITIAL_CURRENCY
  const range = draft.priceMode === 'range'
  const clearPriceErrors = () => {
    for (const key of ['price.amount', 'price.min', 'price.max', 'price.currency']) {
      form.clearError(key)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <TextField
        id={inputId('title')}
        label="Title"
        required
        autoComplete="off"
        value={draft.title}
        onChange={(event) => set('title', event.target.value, 'title')}
        error={errors.title}
      />
      {draft.hasPrice ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1.5 text-sm font-medium text-text">Price</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {range ? (
              <>
                <TextField
                  id={inputId('price.min')}
                  label="Minimum price"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={draft.priceMin}
                  onChange={(event) => set('priceMin', event.target.value, 'price.min')}
                  error={errors['price.min']}
                />
                <TextField
                  id={inputId('price.max')}
                  label="Maximum price"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={draft.priceMax}
                  onChange={(event) => set('priceMax', event.target.value, 'price.max')}
                  error={errors['price.max']}
                />
              </>
            ) : (
              <TextField
                id={inputId('price.amount')}
                label="Price"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={draft.priceAmount}
                onChange={(event) => set('priceAmount', event.target.value, 'price.amount')}
                error={errors['price.amount']}
              />
            )}
            <CurrencySelect
              id={inputId('price.currency')}
              label="Currency"
              value={currency}
              onValueChange={(value) => set('currency', value, 'price.currency')}
              placeholder="Currency"
              error={errors['price.currency']}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex min-h-9 items-center gap-2 text-sm pointer-coarse:min-h-11">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={range}
                onChange={(event) => {
                  clearPriceErrors()
                  set('priceMode', event.target.checked ? 'range' : 'single', 'price.amount')
                }}
              />
              Price range
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearPriceErrors()
                set('hasPrice', false, 'price.amount')
              }}
            >
              <X aria-hidden className="size-4" />
              Remove price
            </Button>
          </div>
        </fieldset>
      ) : (
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              set('currency', draft.currency || INITIAL_CURRENCY, 'price.currency')
              set('hasPrice', true, 'price.amount')
            }}
          >
            <Plus aria-hidden className="size-4" />
            Add price
          </Button>
        </div>
      )}
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
}

function KindInput({ field, form }: { field: Field; form: FormState }) {
  const { draft, errors, setMeta } = form
  const key = `metadata.${field.key}`
  const value = draft.meta[field.key] ?? ''
  const common = { id: inputId(key), label: field.label, error: errors[key] }
  switch (field.input) {
    case 'enum':
      return (
        <Select
          {...common}
          options={[
            { value: NONE, label: 'Not set' },
            ...(field.options ?? []).map((o) => ({ value: o.value, label: o.label })),
          ]}
          value={value || NONE}
          onValueChange={(next) => setMeta(field.key, next === NONE ? '' : next)}
        />
      )
    case 'imdb_url':
      return (
        <TextField
          {...common}
          label="IMDb link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.imdb.com/title/tt…"
          value={value}
          onChange={(event) => setMeta(field.key, event.target.value)}
        />
      )
    case 'text':
      return (
        <TextField
          {...common}
          autoComplete="off"
          value={value}
          onChange={(event) => setMeta(field.key, event.target.value)}
        />
      )
    default:
      // year, integer, decimal
      return (
        <TextField
          {...common}
          inputMode={field.input === 'decimal' ? 'decimal' : 'numeric'}
          autoComplete="off"
          suffix={field.unit}
          value={value}
          onChange={(event) => setMeta(field.key, event.target.value)}
        />
      )
  }
}

/** The kind-specific fields, rendered from the same configs as the view (`kinds/*.ts`). */
export function KindFieldsSection({ form }: { form: FormState }) {
  const { draft, errors, defaults, set } = form
  const fields = kindFields[draft.kind]
  if (fields.length === 0) return null
  const streaming = fields.some((field) => field.input === 'streaming')
  return (
    <FormSection id="item-form-kind" title={`${kindLabels[draft.kind]} details`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {simpleFields(draft.kind).map((field) => (
          <KindInput key={field.key} field={field} form={form} />
        ))}
        {streaming && (
          <>
            <CountrySelect
              id={inputId('metadata.streaming.country')}
              label="Streaming country"
              placeholder={defaults.country || 'Country'}
              hint="Defaults to your streaming country."
              value={draft.streamingCountry}
              onValueChange={(value) =>
                set('streamingCountry', value, 'metadata.streaming.country')
              }
              error={errors['metadata.streaming.country']}
            />
            <TextField
              id={inputId('metadata.streaming.platforms')}
              label="Streaming platforms"
              autoComplete="off"
              hint="Separate with commas."
              value={draft.streamingPlatforms}
              onChange={(event) =>
                set('streamingPlatforms', event.target.value, 'metadata.streaming.platforms')
              }
              error={errors['metadata.streaming.platforms']}
            />
          </>
        )}
      </div>
    </FormSection>
  )
}
