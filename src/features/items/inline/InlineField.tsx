import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { IconButton } from '../../../components/ui'
import { Check, Pencil, X } from '../../../components/ui/icons'
import { ApiError, NetworkError } from '../../../lib/api'
import { cx } from '../../../lib/cx'
import { itemKeys, useUpdateItem, type Item } from '../api'
import {
  buildPatch,
  draftDump,
  draftFromItem,
  inputId,
  isDirty,
  mapServerErrors,
  validate,
  type Draft,
  type ErrorMap,
} from '../form/draft'
import { ConflictBanner, GoneBanner, MessageBanner, NetworkBanner } from './Banners'
import { FieldInputs, type FieldForm } from './editors'
import type { FieldSpec } from './fields'
import { useEditGuard } from './guard'
import { useSettings } from '../../settings/api'

/** Pen, ✓ and ✕ are the same on the description, so they are shared. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

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
        'absolute top-0 right-0 size-8 text-text-muted opacity-0 transition-opacity duration-150 focus-visible:opacity-100 pointer-coarse:size-11',
        group === 'field'
          ? 'group-focus-within/field:opacity-100 group-hover/field:opacity-100'
          : 'group-focus-within/desc:opacity-100 group-hover/desc:opacity-100',
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

const STACKED = ['price', 'years', 'metadata.streaming']

type Failure =
  { kind: 'conflict' } | { kind: 'gone' } | { kind: 'network' } | { kind: 'other'; message: string }

interface InlineFieldProps {
  item: Item
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
}

/**
 * One field of the item, edited in place (F-002 "No edit mode"). Shows the value, with a pen on
 * hover or keyboard focus; a click on the value, the pen, or Enter on the focused pen opens the
 * editor. Each save is its own PATCH with only this field and the item's current `If-Match`.
 */
export function InlineField({
  item,
  spec,
  children,
  initialDraft,
  startOpen = false,
  onClose,
  className,
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
      <div
        onClick={onClick}
        className="cursor-text rounded-sm pr-9 transition-colors hover:bg-fill/60 pointer-coarse:pr-12"
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

function FieldEditor({
  item,
  spec,
  initialDraft,
  focusDelay,
  className,
  onDone,
}: {
  item: Item
  spec: FieldSpec
  initialDraft?: Partial<Draft>
  focusDelay: boolean
  className?: string
  onDone: () => void
}) {
  const client = useQueryClient()
  const update = useUpdateItem()
  const guard = useEditGuard()
  const settings = useSettings()
  const defaults = { country: settings.data?.streaming_country_code ?? '' }
  // One write at a time: the next one needs the version the previous one returns.
  const busy = useIsMutating() > 0

  const [draft, setDraft] = useState<Draft>(() => ({ ...draftFromItem(item), ...initialDraft }))
  const [errors, setErrors] = useState<ErrorMap>({})
  const [otherErrors, setOtherErrors] = useState<string[]>([])
  const [failure, setFailure] = useState<Failure | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  // The draft of this field on top of the item as it is now (not as it was when the editor opened).
  const merged = (source: Draft) => spec.take(draftFromItem(item), source)
  const dirty = isDirty(item, merged(draft), defaults)
  useEffect(() => {
    guard.setDirty(spec.id, dirty)
    return () => guard.setDirty(spec.id, false)
  }, [dirty, guard, spec.id])

  // Focus the first input once opened; from the "+ Add field" menu after Radix gave focus back.
  useEffect(() => {
    const focus = () => {
      // Never steal focus from an input the user already moved to.
      if (box.current?.contains(document.activeElement)) return
      box.current
        ?.querySelector<HTMLElement>('input:not([type=checkbox]), button[role=combobox]')
        ?.focus()
    }
    if (!focusDelay) return focus()
    const timer = setTimeout(focus, 80)
    return () => clearTimeout(timer)
  }, [focusDelay])
  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  const form: FieldForm = {
    draft,
    errors,
    defaults,
    set: (key, value, errorKey) => {
      setDraft((current) => ({ ...current, [key]: value }))
      clearError(errorKey)
    },
    setMeta: (key, value) => {
      setDraft((current) => ({ ...current, meta: { ...current.meta, [key]: value } }))
      clearError(`metadata.${key}`)
    },
    clearError,
    commit: (change) => {
      const next = { ...draft, ...change }
      setDraft(next)
      void save(next)
    },
  }

  const showErrors = (found: ErrorMap) => {
    setErrors(found)
    const first = spec.errorKeys.find((key) => found[key])
    if (first) setFocusRequest((current) => ({ id: inputId(first), n: (current?.n ?? 0) + 1 }))
  }

  const save = async (source: Draft = draft) => {
    setFailure(null)
    setOtherErrors([])
    const next = merged(source)
    const all = validate(next, defaults)
    const found = Object.fromEntries(
      Object.entries(all).filter(([key]) => spec.errorKeys.includes(key)),
    )
    if (Object.keys(found).length > 0) return showErrors(found)
    const patch = buildPatch(item, next, defaults)
    if (Object.keys(patch).length === 0) return onDone()
    try {
      await update.mutateAsync({ item, patch })
      onDone()
    } catch (caught) {
      fail(caught, source)
    }
  }

  const fail = (caught: unknown, source: Draft) => {
    if (caught instanceof ApiError) {
      if (caught.status === 412) return setFailure({ kind: 'conflict' })
      if (caught.status === 404) return setFailure({ kind: 'gone' })
      if (caught.status === 422 && caught.errors?.length) {
        const mapped = mapServerErrors(caught.errors, item.kind, source.priceMode)
        const own = Object.fromEntries(
          Object.entries(mapped.fields).filter(([key]) => spec.errorKeys.includes(key)),
        )
        const rest = Object.entries(mapped.fields)
          .filter(([key]) => !spec.errorKeys.includes(key))
          .map(([key, message]) => `${key}: ${message}`)
        setOtherErrors([...mapped.other, ...rest])
        return showErrors(own)
      }
      if (caught.status >= 500) return setFailure({ kind: 'network' })
      return setFailure({ kind: 'other', message: caught.detail ?? caught.title })
    }
    if (caught instanceof NetworkError) return setFailure({ kind: 'network' })
    setFailure({ kind: 'other', message: 'Something went wrong. Your changes are kept.' })
  }

  // The draft is dropped only once the latest version was fetched, and the user asked for it.
  const reloadLatest = async () => {
    setReloading(true)
    setReloadFailed(false)
    try {
      await client.refetchQueries(
        { queryKey: itemKeys.detail(item.id), exact: true },
        { throwOnError: true },
      )
      onDone()
    } catch {
      setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  const draftText = () => draftDump(item, merged(draft), defaults)

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    // Keys from a popup (portal) or a combobox with its list open belong to that popup.
    if (event.defaultPrevented || !event.currentTarget.contains(target)) return
    if (event.key === 'Escape') {
      if (target.getAttribute('aria-expanded') === 'true') return
      event.preventDefault()
      event.stopPropagation()
      onDone()
    } else if (event.key === 'Enter' && target.matches('input:not([role=combobox])')) {
      if ((target as HTMLInputElement).type === 'checkbox') return
      event.preventDefault()
      void save()
    }
  }

  // Several inputs (price, years, streaming) would be crushed by the buttons beside them in the
  // narrow item panel: their ✓ and ✕ go below the inputs instead of at the end of one input.
  const stacked = STACKED.includes(spec.id)
  return (
    <div ref={box} onKeyDown={onKeyDown} className={cx('flex flex-col gap-2', className)}>
      <div className={stacked ? 'flex flex-col gap-3' : 'flex items-start gap-2'}>
        <div className="min-w-0 flex-1">
          <FieldInputs spec={spec} form={form} canRemovePrice={item.price !== null} />
        </div>
        <EditorButtons
          label={spec.label.toLowerCase()}
          onSave={() => void save()}
          onCancel={onDone}
          pending={update.isPending}
          disabled={busy || failure?.kind === 'conflict' || failure?.kind === 'gone'}
        />
      </div>
      {failure?.kind === 'conflict' && (
        <ConflictBanner
          message="Someone else changed this item while you were editing. Your change has not been saved."
          draftText={draftText}
          onReload={() => void reloadLatest()}
          reloading={reloading}
          reloadFailed={reloadFailed}
        />
      )}
      {failure?.kind === 'gone' && (
        <GoneBanner
          message="This item was deleted or moved to Trash. Your change has not been saved."
          draftText={draftText}
        />
      )}
      {failure?.kind === 'network' && (
        <NetworkBanner onRetry={() => void save()} pending={update.isPending}>
          The server could not be reached. Nothing was saved, and your change is still here.
        </NetworkBanner>
      )}
      {failure?.kind === 'other' && <MessageBanner>{failure.message}</MessageBanner>}
      {otherErrors.length > 0 && (
        <MessageBanner>
          <ul className="list-disc pl-5">
            {otherErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </MessageBanner>
      )}
    </div>
  )
}
