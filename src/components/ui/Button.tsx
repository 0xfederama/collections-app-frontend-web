import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { LoaderCircle } from './icons'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-hover active:brightness-95',
  secondary:
    'border border-border-strong bg-surface text-text hover:bg-surface-raised active:bg-border',
  ghost: 'text-text hover:bg-border active:bg-border-strong/30',
  danger:
    'bg-danger text-danger-fg hover:bg-danger-hover active:bg-danger-hover active:brightness-95',
}

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm pointer-coarse:min-h-11',
  md: 'h-10 gap-2 px-4 text-sm pointer-coarse:min-h-11',
}

export const buttonBase =
  'inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

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
