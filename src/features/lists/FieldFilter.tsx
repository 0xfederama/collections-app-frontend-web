import * as Popover from '@radix-ui/react-popover'
import { Button, Select, TextField, type SelectOption } from '../../components/ui'
import { Plus, X } from '../../components/ui/icons'
import type { TypeField } from '../items/types'
import { toolbarControl } from './toolbarStyles'

export interface FieldFilterValue {
  field: string
  value: string
  min: string
  max: string
}

// Streaming and store links are tiles, not values a filter can match (F016-W4).
const filterable = (field: TypeField) => field.type !== 'streaming' && field.type !== 'stores'

export function parseFieldFilter(
  params: URLSearchParams,
  fields: readonly TypeField[],
): FieldFilterValue | null {
  const fieldKey = params.get('filter_field')
  if (!fieldKey) return null
  const field = fields.find((candidate) => candidate.key === fieldKey && filterable(candidate))
  if (!field) return null
  const value = params.get('filter_value') ?? ''
  const min = params.get('filter_min') ?? ''
  const max = params.get('filter_max') ?? ''
  if (field.type === 'text' || field.type === 'link') {
    return value.length <= 200 && !min && !max
      ? { field: field.key, value, min: '', max: '' }
      : null
  }
  if (field.type === 'boolean') {
    return (!value || value === 'true' || value === 'false') && !min && !max
      ? { field: field.key, value, min: '', max: '' }
      : null
  }
  if (field.type === 'number') {
    const valid = (v: string) => !v || (v.trim() !== '' && Number.isFinite(Number(v)))
    return valid(min) && valid(max) && !(min && max && Number(min) > Number(max)) && !value
      ? { field: field.key, value: '', min, max }
      : null
  }
  if (field.type === 'date') {
    const valid = (v: string) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
        new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v)
    return valid(min) && valid(max) && !(min && max && min > max) && !value
      ? { field: field.key, value: '', min, max }
      : null
  }
  return null
}

export interface FieldFilterProps {
  fields: readonly TypeField[]
  value: FieldFilterValue | null
  onChange: (value: FieldFilterValue | null) => void
}

/** A compact, keyboard reachable field filter that follows the field's declared type. */
export function FieldFilter({ fields, value, onChange }: FieldFilterProps) {
  const options: SelectOption[] = fields
    .filter(filterable)
    .map(({ key, label }) => ({ value: key, label }))
  if (!options.length) return null
  const field = fields.find((candidate) => candidate.key === value?.field)
  const setField = (key: string) => onChange({ field: key, value: '', min: '', max: '' })
  return (
    <fieldset className="flex flex-wrap items-end gap-2">
      <legend className="sr-only">Filter by field</legend>
      <div className="w-36 [&_label]:sr-only">
        <Select
          label="Filter field"
          options={options}
          value={field?.key ?? ''}
          placeholder="Filter field…"
          onValueChange={setField}
        />
      </div>
      {field && (field.type === 'text' || field.type === 'link') && (
        <div className="w-40 [&_label]:sr-only">
          <TextField
            label={`Filter ${field.label}`}
            type="search"
            placeholder={field.label}
            maxLength={200}
            value={value?.value ?? ''}
            onChange={(event) =>
              onChange({ field: field.key, value: event.target.value, min: '', max: '' })
            }
          />
        </div>
      )}
      {field && (field.type === 'number' || field.type === 'date') && (
        <>
          <div className="w-32 [&_label]:sr-only">
            <TextField
              label={`${field.label} minimum`}
              type={field.type === 'date' ? 'date' : 'number'}
              placeholder="Min"
              value={value?.min ?? ''}
              onChange={(event) =>
                onChange({
                  field: field.key,
                  value: '',
                  min: event.target.value,
                  max: value?.max ?? '',
                })
              }
            />
          </div>
          <div className="w-32 [&_label]:sr-only">
            <TextField
              label={`${field.label} maximum`}
              type={field.type === 'date' ? 'date' : 'number'}
              placeholder="Max"
              value={value?.max ?? ''}
              onChange={(event) =>
                onChange({
                  field: field.key,
                  value: '',
                  min: value?.min ?? '',
                  max: event.target.value,
                })
              }
            />
          </div>
        </>
      )}
      {field?.type === 'boolean' && (
        <div className="w-32 [&_label]:sr-only">
          <Select
            label={`Filter ${field.label}`}
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ]}
            value={value?.value ?? ''}
            placeholder="Choose…"
            onValueChange={(next) => onChange({ field: field.key, value: next, min: '', max: '' })}
          />
        </div>
      )}
      {value && (
        <Button variant="ghost" onClick={() => onChange(null)} aria-label="Clear field filter">
          Clear
        </Button>
      )}
    </fieldset>
  )
}

/** What an applied field filter reads as on its chip, e.g. `Director: Nolan` or `Release year: 2000–`; null while it has no value yet. */
export function describeFieldFilter(
  fields: readonly TypeField[],
  value: FieldFilterValue | null,
): string | null {
  const field = fields.find((candidate) => candidate.key === value?.field)
  if (!field || !value) return null
  let text = value.value
  if (field.type === 'boolean')
    text = value.value === 'true' ? 'Yes' : value.value === 'false' ? 'No' : ''
  if (field.type === 'number' || field.type === 'date') {
    text = value.min || value.max ? `${value.min}–${value.max}` : ''
  }
  return text ? `${field.label}: ${text}` : null
}

/** "+ Filter" opens the field filter in a popover; an applied filter then shows as a chip (`FieldFilterChip`). */
export function FieldFilterMenu(props: FieldFilterProps) {
  if (!props.fields.some(filterable)) return null
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={toolbarControl}>
          <Plus aria-hidden className="size-4" />
          Filter
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="bg-surface-raised z-50 max-w-[calc(100vw-1rem)] rounded-lg p-3 text-text shadow-float data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        >
          <FieldFilter {...props} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The applied field filter as a removable chip, or nothing while none is applied. */
export function FieldFilterChip({ fields, value, onChange }: FieldFilterProps) {
  const text = describeFieldFilter(fields, value)
  if (!text) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 py-0.5 pr-1 pl-3 text-sm text-accent-text">
      {text}
      <button
        type="button"
        aria-label={`Remove filter ${text}`}
        onClick={() => onChange(null)}
        className="grid size-6 place-items-center rounded-full hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-focus-ring pointer-coarse:size-8"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  )
}
