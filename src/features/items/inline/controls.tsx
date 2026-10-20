import { type Ref } from 'react'
import { IconButton } from '../../../components/ui'
import { Check, Pencil, X } from '../../../components/ui/icons'
import { cx } from '../../../lib/cx'

/**
 * The pen of an in-place field: invisible until the field is hovered or holds keyboard focus
 * (`group/field`), then fades in. On touch (`hover: none`) it never shows, the field itself is
 * the tap target; it stays in the tab order and the accessibility tree for keyboard and screen
 * reader users.
 */
export function PenButton({
  label,
  onClick,
  group,
  ref,
}: {
  label: string
  onClick: () => void
  /** The Tailwind group this pen listens to. */
  group: 'field' | 'desc'
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <IconButton
      ref={ref}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        'absolute right-0 size-8 text-text-muted opacity-0 transition-opacity duration-150 focus-visible:opacity-100 pointer-coarse:size-11',
        // No hover fill of its own: it drew a box as strong as the row behind it, so the glyph just
        // darkens and the row reads as one thing (F011-W5).
        'hover:bg-transparent hover:text-text',
        // A field is one line at least as tall as the pen, so the pen is centered in it; the
        // description is long, so its pen stays at the top.
        group === 'field'
          ? 'top-1/2 -translate-y-1/2 group-focus-within/field:opacity-100 group-hover/field:opacity-100'
          : 'top-0 group-focus-within/desc:opacity-100 group-hover/desc:opacity-100',
      )}
    >
      <Pencil aria-hidden />
    </IconButton>
  )
}

/** ✓ saves, ✕ cancels: at the end of the input. */
export function EditorButtons({
  label,
  onSave,
  onCancel,
  saveHint = 'Save (Enter)',
  pending,
  disabled,
}: {
  label: string
  onSave: () => void
  onCancel: () => void
  saveHint?: string
  pending?: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <IconButton
        aria-label={`Save ${label}`}
        title={saveHint}
        variant="secondary"
        onClick={onSave}
        disabled={pending || disabled}
        className="size-10 pointer-coarse:size-11"
      >
        <Check aria-hidden />
      </IconButton>
      <IconButton
        aria-label={`Cancel editing ${label}`}
        title="Cancel (Esc)"
        variant="secondary"
        onClick={onCancel}
        className="size-10 pointer-coarse:size-11"
      >
        <X aria-hidden />
      </IconButton>
    </div>
  )
}
