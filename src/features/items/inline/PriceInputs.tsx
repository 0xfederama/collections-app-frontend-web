import type { ReactNode } from 'react'
import { Button, TextField } from '../../../components/ui'
import { Plus, X } from '../../../components/ui/icons'
import { CurrencySelect } from '../../../components/ui/IsoSelects'
import { cx } from '../../../lib/cx'
import { INITIAL_CURRENCY } from '../form/draft'
import { inputId } from '../form/validate'
import type { FieldForm } from './editors'

const PRICE_KEYS = ['price.amount', 'price.min', 'price.max', 'price.currency']

/**
 * One Price field (F008-W12): the amount and currency, with "Add range" revealing a second amount
 * inside the same field; removing that second amount goes back to a single price. The saved shape
 * is unchanged (`amount`, or `min` / `max` for a range).
 */
export function PriceInputs({
  form,
  canRemove,
  actions,
}: {
  form: FieldForm
  canRemove: boolean
  actions: ReactNode
}) {
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
      {/* One line: the row label already says "Price", so the inputs keep theirs for assistive tech only. */}
      <div
        className={cx(
          'relative flex items-start gap-2 [&_label]:sr-only',
          range ? 'flex-wrap' : 'flex-nowrap',
        )}
      >
        {range ? (
          <>
            <div className="w-28 shrink-0">
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
            <div className="w-28 shrink-0">
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
          <div className="min-w-0 flex-1">
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
        <div className="ml-auto w-24 shrink-0">
          <CurrencySelect
            id={inputId('price.currency')}
            label="Currency"
            value={draft.currency || INITIAL_CURRENCY}
            onValueChange={(value) => set('currency', value, 'price.currency')}
            placeholder="Currency"
            compact
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
        <div className="ml-auto">{actions}</div>
      </div>
    </div>
  )
}
