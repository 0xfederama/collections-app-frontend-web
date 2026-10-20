import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import type { Item } from '../api'
import type { Draft } from '../form/draft'
import type { TypeDefinition } from '../types'
import type { FieldSpec } from './fields'
import { PenButton } from './controls'
import { FieldEditor } from './FieldEditor'

interface InlineFieldProps {
  item: Item
  definition: TypeDefinition
  spec: FieldSpec
  /** The saved value as read-only content. */
  children: ReactNode
  /** Draft changes to apply when the editor opens (a new price, single or range). */
  initialDraft?: Partial<Draft>
  /** Open the editor at once ("+ Add field"). */
  startOpen?: boolean
  /** The editor closed (saved or cancelled). */
  onClose?: () => void
  className?: string
  /**
   * Extra classes for the hover/focus bar itself, for a row that is taller than one line (W6: the
   * streaming tiles want even padding around them). The other rows keep the default.
   */
  barClassName?: string
}

/**
 * One field of the item, edited in place (F-002 "No edit mode"). Shows the value, with a pen on
 * hover or keyboard focus; a click on the value, the pen, or Enter on the focused pen opens the
 * editor. Each save is its own PATCH with only this field and the `If-Match` of the version the editor opened on.
 */
export function InlineField({
  item,
  definition,
  spec,
  children,
  initialDraft,
  startOpen = false,
  onClose,
  className,
  barClassName,
}: InlineFieldProps) {
  const [open, setOpen] = useState(startOpen)
  const pen = useRef<HTMLButtonElement>(null)
  // After ✓ or ✕ the editor disappears, so focus goes back to the way in.
  const [restoreFocus, setRestoreFocus] = useState(0)
  useEffect(() => {
    if (restoreFocus > 0) pen.current?.focus()
  }, [restoreFocus])

  if (open) {
    return (
      <FieldEditor
        item={item}
        definition={definition}
        spec={spec}
        initialDraft={initialDraft}
        focusDelay={startOpen}
        className={className}
        onDone={() => {
          setRestoreFocus((n) => n + 1)
          setOpen(false)
          onClose?.()
        }}
      />
    )
  }
  // A click on the value starts editing (a mouse and touch shortcut); links inside it still work.
  const onClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a, button')) return
    if (window.getSelection()?.toString()) return
    setOpen(true)
  }
  return (
    <div className={cx('group/field relative', className)}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the pen button inside this row is the keyboard path to the editor; a click anywhere on the row is a pointer shortcut */}
      <div
        onClick={onClick}
        className={cx(
          // F011-W5: the hover follows the whole row (the pen is inside this wrapper), so pointing at
          // the pen lights the same background instead of leaving it bare.
          'grid min-h-8 cursor-text content-center rounded-sm pr-9 transition-colors group-hover/field:bg-fill/60 pointer-coarse:min-h-11 pointer-coarse:pr-12',
          barClassName,
        )}
      >
        {children}
      </div>
      <PenButton
        ref={pen}
        group="field"
        label={`Edit ${spec.label.toLowerCase()}`}
        onClick={() => setOpen(true)}
      />
    </div>
  )
}
