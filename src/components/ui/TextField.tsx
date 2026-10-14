import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { controlBase, controlBorder } from './fieldStyles'

export interface FieldChromeProps {
  label: string
  hint?: string
  error?: string
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  required,
}: FieldChromeProps & { id: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required && (
          <span aria-hidden className="text-danger-text">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}

export const describedBy = (id: string, hint?: string, error?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined

export interface TextFieldProps
  extends FieldChromeProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Slot before the value, e.g. a currency symbol. */
  prefix?: ReactNode
  /** Slot after the value, e.g. a unit like "cc". */
  suffix?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, prefix, suffix, id: idProp, className, required, ...rest },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <div
        className={cx(
          controlBase,
          controlBorder(!!error),
          'flex h-10 items-center gap-2 px-3 focus-within:border-accent has-disabled:opacity-50 pointer-coarse:min-h-11',
          className,
        )}
      >
        {prefix && <span className="shrink-0 text-text-muted">{prefix}</span>}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
          {...rest}
        />
        {suffix && <span className="shrink-0 text-text-muted">{suffix}</span>}
      </div>
    </FieldShell>
  )
})
