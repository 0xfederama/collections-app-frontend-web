import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { LoaderCircle } from './icons'

export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

/** Colour and weight per variant (F021: flat, no glow; primary and ink 600, secondary 500). */
export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent font-semibold text-accent-fg hover:bg-accent-hover active:bg-accent-hover',
  ink: 'bg-ink font-semibold text-ink-fg hover:bg-ink/85 active:bg-ink/80',
  secondary:
    'border border-border bg-surface font-medium text-text hover:bg-fill-hover active:bg-fill-hover',
  ghost: 'font-medium text-text hover:bg-fill-hover active:bg-fill-hover',
  danger: 'bg-danger font-semibold text-danger-fg hover:bg-danger-hover active:bg-danger-hover',
}

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-ui pointer-coarse:min-h-11',
  md: 'h-10 gap-2 px-4 text-ui pointer-coarse:min-h-11',
}

export const buttonBase =
  'inline-flex select-none items-center justify-center whitespace-nowrap rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

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
