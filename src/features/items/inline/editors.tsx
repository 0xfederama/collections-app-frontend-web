import { Button, Select, TextField } from '../../../components/ui'
import { Plus, X } from '../../../components/ui/icons'
import { CurrencySelect } from '../../../components/ui/IsoSelects'
import { cx } from '../../../lib/cx'
import { StreamingPlatforms } from './StreamingPlatforms'
import {
  INITIAL_CURRENCY,
  inputId,
  parsePlatforms,
  type Defaults,
  type Draft,
  type ErrorMap,
} from '../form/draft'
import type { FieldSpec } from './fields'

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

const PRICE_KEYS = ['price.amount', 'price.min', 'price.max', 'price.currency']

/**
 * One Price field (F008-W12): the amount and currency, with "Add range" revealing a second amount
 * inside the same field; removing that second amount goes back to a single price. The saved shape
 * is unchanged (`amount`, or `min` / `max` for a range).
 */
function PriceInputs({ form, canRemove }: { form: FieldForm; canRemove: boolean }) {
  const { draft, errors, set } = form
  const range = draft.priceMode === 'range'
  const clearErrors = () => PRICE_KEYS.forEach(form.clearError)
  const toRange = () => {
    clearErrors()
    set('priceMin', draft.priceAmount, 'price.min')
    set('priceMax', '', 'price.max')
    set('priceMode', 'range', 'price.amount')
  }
  const toSingle = () => {
    clearErrors()
    set('priceAmount', draft.priceMin, 'price.amount')
    set('priceMode', 'single', 'price.amount')
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        {range ? (
          <>
            <div className="w-32">
              <TextField
                id={inputId('price.min')}
                label="Minimum price"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={draft.priceMin}
                onChange={(event) => set('priceMin', event.target.value, 'price.min')}
                error={errors['price.min']}
              />
            </div>
            <span aria-hidden className="mt-2 text-text-muted">
              –
            </span>
            <div className="w-32">
              <TextField
                id={inputId('price.max')}
                label="Maximum price"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={draft.priceMax}
                onChange={(event) => set('priceMax', event.target.value, 'price.max')}
                error={errors['price.max']}
              />
            </div>
          </>
        ) : (
          <div className="w-32">
            <TextField
              id={inputId('price.amount')}
              label="Price"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={draft.priceAmount}
              onChange={(event) => set('priceAmount', event.target.value, 'price.amount')}
              error={errors['price.amount']}
            />
          </div>
        )}
        <div className="min-w-40 flex-1">
          <CurrencySelect
            id={inputId('price.currency')}
            label="Currency"
            value={draft.currency || INITIAL_CURRENCY}
            onValueChange={(value) => set('currency', value, 'price.currency')}
            placeholder="Currency"
            error={errors['price.currency']}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {range ? (
          <Button variant="ghost" size="sm" onClick={toSingle}>
            <X aria-hidden className="size-4" />
            Remove range
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={toRange}>
            <Plus aria-hidden className="size-4" />
            Add range
          </Button>
        )}
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={() => form.commit({ hasPrice: false })}>
            <X aria-hidden className="size-4" />
            Remove price
          </Button>
        )}
      </div>
    </div>
  )
}

/** The platforms (a multi-choice dropdown), and a toggle per platform for "paid per title". */
function StreamingInputs({ form }: { form: FieldForm }) {
  const { draft, errors, set } = form
  const platforms = parsePlatforms(draft.streamingPlatforms)
  const isPaid = (name: string) =>
    draft.streamingPaid.some((paid) => paid.toLowerCase() === name.toLowerCase())
  const toggle = (name: string) =>
    set(
      'streamingPaid',
      isPaid(name)
        ? draft.streamingPaid.filter((paid) => paid.toLowerCase() !== name.toLowerCase())
        : [...draft.streamingPaid, name],
      'metadata.streaming.platforms',
    )
  return (
    <div className="flex flex-col gap-3">
      {/* F011-W1: the country is not asked here. The contract still requires it on every streaming
          object, so the draft sends the item's own country, or the one from Settings when it has
          none (`toFields`). */}
      <div>
        <p className="mb-1.5 text-sm text-text">Streaming platforms</p>
        <StreamingPlatforms
          value={platforms}
          onChange={(next) =>
            set('streamingPlatforms', next.join(', '), 'metadata.streaming.platforms')
          }
          error={errors['metadata.streaming.platforms']}
        />
        {errors['metadata.streaming.country'] && (
          <p className="mt-1.5 text-xs text-danger-text">{errors['metadata.streaming.country']}</p>
        )}
      </div>
      {platforms.length > 0 && (
        <div role="group" aria-label="Paid platforms" className="flex flex-col gap-1.5">
          <p className="text-xs text-text-muted">
            Mark the platforms that offer it only for payment ($).
          </p>
          <ul className="flex flex-wrap gap-2">
            {platforms.map((name) => (
              <li key={name.toLowerCase()}>
                <button
                  type="button"
                  aria-pressed={isPaid(name)}
                  onClick={() => toggle(name)}
                  className={cx(
                    'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                    isPaid(name)
                      ? 'border-accent bg-accent/10 text-accent-text'
                      : 'border-border-strong bg-surface text-text',
                  )}
                >
                  {name}
                  <span aria-hidden>{isPaid(name) ? '$' : ''}</span>
                  <span className="sr-only">{isPaid(name) ? ', paid' : ', included'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** The inputs of one field; the widget of a kind field follows its config (`kinds/*.ts`). */
export function FieldInputs({
  spec,
  form,
  canRemovePrice,
}: {
  spec: FieldSpec
  form: FieldForm
  canRemovePrice: boolean
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
      return <PriceInputs form={form} canRemove={canRemovePrice} />
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
  const key = `metadata.${field.key}`
  const value = draft.meta[field.key] ?? ''
  const common = { id: inputId(key), label: field.label, error: errors[key] }
  if (field.input === 'enum') {
    return (
      <div className={singleInput}>
        <Select
          {...common}
          options={[
            { value: NONE, label: 'Not set' },
            ...(field.options ?? []).map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ]}
          value={value || NONE}
          onValueChange={(next) => setMeta(field.key, next === NONE ? '' : next)}
        />
      </div>
    )
  }
  const numeric = field.input === 'year' || field.input === 'integer' || field.input === 'decimal'
  return (
    <div className={singleInput}>
      <TextField
        {...common}
        label={field.input === 'imdb_url' ? 'IMDb link' : field.label}
        type={field.input === 'imdb_url' ? 'url' : undefined}
        inputMode={field.input === 'decimal' ? 'decimal' : numeric ? 'numeric' : undefined}
        autoComplete="off"
        placeholder={field.input === 'imdb_url' ? 'https://www.imdb.com/title/tt…' : undefined}
        suffix={field.unit}
        value={value}
        onChange={(event) => setMeta(field.key, event.target.value)}
      />
    </div>
  )
}
