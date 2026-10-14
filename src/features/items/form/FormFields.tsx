import { useMemo, type ReactNode } from 'react'
import { Select, TextArea, TextField, kindLabels, type SelectOption } from '../../../components/ui'
import type { ItemKind } from '../api'
import { kindFields, type Field } from '../kinds'
import { inputId, simpleFields, type Defaults, type Draft, type ErrorMap } from './draft'

/** What the sections need from the form: values, errors and setters. */
export interface FormState {
  draft: Draft
  errors: ErrorMap
  defaults: Defaults
  /** Sets a top-level draft field (and clears that input's error). */
  set: <K extends keyof Draft>(key: K, value: Draft[K], errorKey: string) => void
  setMeta: (key: string, value: string) => void
  setKind: (kind: ItemKind) => void
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

const kindOptions: SelectOption[] = (Object.keys(kindLabels) as ItemKind[]).map((kind) => ({
  value: kind,
  label: kindLabels[kind],
}))

/** ISO 4217 codes the browser knows, with their names; falls back to a short list. */
function currencyOptions(selected: string): SelectOption[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  const codes = intl.supportedValuesOf?.('currency') ?? ['EUR', 'USD', 'GBP', 'JPY', 'CHF']
  const list = selected && !codes.includes(selected) ? [selected, ...codes] : codes
  let names: Intl.DisplayNames | undefined
  try {
    names = new Intl.DisplayNames(undefined, { type: 'currency' })
  } catch {
    names = undefined
  }
  return list.map((code) => ({
    value: code,
    label: names?.of(code) && names.of(code) !== code ? `${code} · ${names.of(code)}` : code,
  }))
}

/** Title, kind, summary, status, price and official website (UI_SPEC §4 "Basics"). */
export function BasicsFields({
  form,
  kindWarning,
}: {
  form: FormState
  kindWarning: string | null
}) {
  const { draft, errors, defaults, set } = form
  const currency = draft.currency || defaults.currency
  const currencies = useMemo(() => currencyOptions(currency), [currency])
  const onlyMax = draft.priceMax.trim() !== '' && draft.priceMin.trim() === ''
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
      <div className="flex flex-col gap-2">
        <Select
          id={inputId('kind')}
          label="Kind"
          options={kindOptions}
          value={draft.kind}
          onValueChange={(value) => form.setKind(value as ItemKind)}
          error={errors.kind}
        />
        {kindWarning && (
          <p role="note" className="text-sm text-warning-text">
            {kindWarning}
          </p>
        )}
      </div>
      <TextArea
        id={inputId('summary')}
        label="Summary"
        rows={3}
        value={draft.summary}
        onChange={(event) => set('summary', event.target.value, 'summary')}
        error={errors.summary}
      />
      <TextField
        id={inputId('status')}
        label="Status"
        hint="For example Owned, Wishlist or Watched."
        autoComplete="off"
        value={draft.status}
        onChange={(event) => set('status', event.target.value, 'status')}
        error={errors.status}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-text">Price</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            hint={onlyMax ? 'With no minimum, the price shows as “up to” this amount.' : undefined}
            value={draft.priceMax}
            onChange={(event) => set('priceMax', event.target.value, 'price.max')}
            error={errors['price.max']}
          />
          <Select
            id={inputId('price.currency')}
            label="Currency"
            options={currencies}
            value={currency || undefined}
            onValueChange={(value) => set('currency', value, 'price.currency')}
            placeholder="Currency"
            error={errors['price.currency']}
          />
        </div>
        <p className="text-xs text-text-muted">
          Enter one price in both fields, a range, or only a maximum. Leave both empty for no price.
        </p>
      </fieldset>
      <TextField
        id={inputId('official_website_url')}
        label="Official website"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://"
        value={draft.officialUrl}
        onChange={(event) => set('officialUrl', event.target.value, 'official_website_url')}
        error={errors.official_website_url}
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
            <TextField
              id={inputId('metadata.streaming.country')}
              label="Streaming country"
              autoComplete="off"
              maxLength={2}
              placeholder={defaults.country || 'IT'}
              hint="Two-letter code. Defaults to your streaming country."
              value={draft.streamingCountry}
              onChange={(event) =>
                set('streamingCountry', event.target.value, 'metadata.streaming.country')
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
