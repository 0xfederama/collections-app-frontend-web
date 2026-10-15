import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { LoaderCircle } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg shadow-accent hover:bg-accent-hover active:bg-accent-hover',
  secondary:
    'bg-surface text-text shadow-sm hover:bg-[color-mix(in_srgb,var(--surface),var(--text)_6%)] hover:shadow-md active:bg-[color-mix(in_srgb,var(--surface),var(--text)_10%)]',
  ghost: 'text-text hover:bg-fill-hover active:bg-fill-hover',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover active:bg-danger-hover',
}

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm pointer-coarse:min-h-11',
  md: 'h-10 gap-2 px-4 text-sm pointer-coarse:min-h-11',
}

export const buttonBase =
  'inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-[color,background-color,box-shadow,transform] active:scale-[0.97] active:ease-spring disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner, sets aria-busy and blocks activation (no double submit). */
  pending?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    pending = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cx(buttonBase, buttonVariantClasses[variant], buttonSizeClasses[size], className)}
      {...rest}
    >
      {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  )
})
