import { Button, Select, TextField, type SelectOption } from '../../components/ui'
import type { KindField } from '../items/kinds'

export interface FieldFilterValue {
  field: string
  value: string
  min: string
  max: string
}

const filterable = (field: KindField) => field.type !== 'streaming'

export function parseFieldFilter(
  params: URLSearchParams,
  fields: readonly KindField[],
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
  fields: readonly KindField[]
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
