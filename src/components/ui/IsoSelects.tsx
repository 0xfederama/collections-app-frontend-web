import { useMemo } from 'react'
import { countryOptions, currencyOptions } from '../../lib/iso'
import { Combobox, type ComboboxProps } from './Combobox'

type IsoSelectProps = Omit<ComboboxProps, 'options' | 'value'> & {
  /** The ISO code, or empty/undefined for none. */
  value?: string | null
}

/** Searchable ISO 3166-1 country picker; the value is the two-letter code. */
export function CountrySelect({
  value,
  emptyMessage = 'No matching country',
  ...rest
}: IsoSelectProps) {
  const options = useMemo(() => countryOptions(value || undefined), [value])
  return <Combobox {...rest} options={options} value={value || null} emptyMessage={emptyMessage} />
}

/** Searchable ISO 4217 currency picker; the value is the three-letter code. */
export function CurrencySelect({
  value,
  emptyMessage = 'No matching currency',
  ...rest
}: IsoSelectProps) {
  const options = useMemo(() => currencyOptions(value || undefined), [value])
  return <Combobox {...rest} options={options} value={value || null} emptyMessage={emptyMessage} />
}
