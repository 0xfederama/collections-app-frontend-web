import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { buttonBase, buttonVariantClasses, type ButtonVariant } from './Button'

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** Required: icon-only buttons need an accessible name. */
  'aria-label': string
  variant?: Exclude<ButtonVariant, 'primary'> | 'primary'
}

/** Square icon-only button with a ≥44px hit area. Pass a decorative icon as children. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        buttonBase,
        buttonVariantClasses[variant],
        'size-11 shrink-0 [&_svg]:size-5',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
