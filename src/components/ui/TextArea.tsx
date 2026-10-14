import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { controlBase, controlBorder } from './fieldStyles'
import { FieldShell, describedBy, type FieldChromeProps } from './TextField'

export interface TextAreaProps
  extends FieldChromeProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, id: idProp, className, required, rows = 4, ...rest },
  ref,
) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(
          controlBase,
          controlBorder(!!error),
          'px-3 py-2 focus:border-accent',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  )
})
